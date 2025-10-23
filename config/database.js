const sql = require('mssql');
const { DefaultAzureCredential } = require('@azure/identity');

const SQL_SCOPE = 'https://database.windows.net/.default';

const sqlConfig = {
  server: process.env.SQL_SERVER,
  database: process.env.SQL_DATABASE,
  options: {
    encrypt: true,
    trustServerCertificate: false
  }
};

let pool = null;
let credential = null;
let cachedToken = null;

const hasManagedIdentityConfig = () => {
  return Boolean(sqlConfig.server && sqlConfig.database && !process.env.SQL_CONNECTION_STRING);
};

const getAccessToken = async () => {
  if (!hasManagedIdentityConfig()) {
    return null;
  }

  if (!credential) {
    credential = new DefaultAzureCredential();
  }

  const fresh = await credential.getToken(SQL_SCOPE);
  cachedToken = {
    token: fresh.token,
    expiresOnTimestamp: fresh.expiresOnTimestamp
  };
  return cachedToken.token;
};

const connectWithManagedIdentity = async () => {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Unable to acquire Azure AD token for SQL Database.');
  }

  return sql.connect({
    server: sqlConfig.server,
    database: sqlConfig.database,
    options: sqlConfig.options,
    authentication: {
      type: 'azure-active-directory-access-token',
      options: {
        token
      }
    }
  });
};

const connectWithConnectionString = async () => {
  return sql.connect(process.env.SQL_CONNECTION_STRING);
};

const getPool = async () => {
  if (pool && pool.connected) {
    return pool;
  }

  if (!sqlConfig.server && !process.env.SQL_CONNECTION_STRING) {
    throw new Error('SQL configuration is missing. Provide SQL_SERVER/SQL_DATABASE or SQL_CONNECTION_STRING.');
  }

  pool = process.env.SQL_CONNECTION_STRING
    ? await connectWithConnectionString()
    : await connectWithManagedIdentity();

  pool.on('error', (err) => {
    console.error('SQL pool error:', err);
    pool.close().catch(() => undefined);
    pool = null;
  });

  return pool;
};

const ensureIntakeTable = async () => {
  const sqlPool = await getPool();
  const createTableQuery = `
    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'IntakeForms' AND schema_id = SCHEMA_ID('dbo'))
    BEGIN
      CREATE TABLE dbo.IntakeForms (
        Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
        UserId NVARCHAR(255) NOT NULL,
        Email NVARCHAR(256) NOT NULL,
        FirstName NVARCHAR(150) NULL,
        LastName NVARCHAR(150) NULL,
        Department NVARCHAR(150) NULL,
        JobTitle NVARCHAR(150) NULL,
        OfficeLocation NVARCHAR(150) NULL,
        WorkPhone NVARCHAR(50) NULL,
        Address NVARCHAR(500) NULL,
        City NVARCHAR(150) NULL,
        State NVARCHAR(50) NULL,
        ZipCode NVARCHAR(20) NULL,
        Phone NVARCHAR(50) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
      );

      CREATE INDEX IX_IntakeForms_UserId ON dbo.IntakeForms(UserId);
      CREATE INDEX IX_IntakeForms_Email ON dbo.IntakeForms(Email);
    END
  `;

  await sqlPool.request().query(createTableQuery);
  return sqlPool;
};

const upsertIntakeForm = async (form) => {
  const sqlPool = await ensureIntakeTable();
  const now = new Date();

  const request = sqlPool.request();
  request.input('UserId', sql.NVarChar(255), form.userId);
  request.input('Email', sql.NVarChar(256), form.email);
  request.input('FirstName', sql.NVarChar(150), form.firstName);
  request.input('LastName', sql.NVarChar(150), form.lastName);
  request.input('Department', sql.NVarChar(150), form.department);
  request.input('JobTitle', sql.NVarChar(150), form.jobTitle);
  request.input('OfficeLocation', sql.NVarChar(150), form.officeLocation);
  request.input('WorkPhone', sql.NVarChar(50), form.workPhone);
  request.input('Address', sql.NVarChar(500), form.address);
  request.input('City', sql.NVarChar(150), form.city);
  request.input('State', sql.NVarChar(50), form.state);
  request.input('ZipCode', sql.NVarChar(20), form.zipCode);
  request.input('Phone', sql.NVarChar(50), form.phone);
  request.input('UpdatedAt', sql.DateTime2, now);

  const upsertQuery = `
    IF EXISTS (SELECT 1 FROM dbo.IntakeForms WHERE UserId = @UserId)
    BEGIN
      UPDATE dbo.IntakeForms
      SET
        Email = @Email,
        FirstName = @FirstName,
        LastName = @LastName,
        Department = @Department,
        JobTitle = @JobTitle,
        OfficeLocation = @OfficeLocation,
        WorkPhone = @WorkPhone,
        Address = @Address,
        City = @City,
        State = @State,
        ZipCode = @ZipCode,
        Phone = @Phone,
        UpdatedAt = @UpdatedAt
      WHERE UserId = @UserId;
    END
    ELSE
    BEGIN
      INSERT INTO dbo.IntakeForms (
        UserId,
        Email,
        FirstName,
        LastName,
        Department,
        JobTitle,
        OfficeLocation,
        WorkPhone,
        Address,
        City,
        State,
        ZipCode,
        Phone,
        CreatedAt,
        UpdatedAt
      ) VALUES (
        @UserId,
        @Email,
        @FirstName,
        @LastName,
        @Department,
        @JobTitle,
        @OfficeLocation,
        @WorkPhone,
        @Address,
        @City,
        @State,
        @ZipCode,
        @Phone,
        @UpdatedAt,
        @UpdatedAt
      );
    END
  `;

  await request.query(upsertQuery);
};

module.exports = {
  getPool,
  ensureIntakeTable,
  upsertIntakeForm
};
