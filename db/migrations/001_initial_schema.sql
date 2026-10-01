-- ----------------------------------------------------------
-- MDB Tools - A library for reading MS Access database files
-- Copyright (C) 2000-2011 Brian Bruns and others.
-- Files in libmdb are licensed under LGPL and the utilities under
-- the GPL, see COPYING.LIB and COPYING files respectively.
-- Check out http://mdbtools.sourceforge.net
-- ----------------------------------------------------------

-- That file uses encoding UTF-8

CREATE TABLE `ADMINISTRACIONCAJA`
 (
	`FECHA`			datetime, 
	`FONDOAPERTURA`			float, 
	`FONDOCIERRE`			float, 
	`CODUSUARIOAPERTURA`			varchar (6), 
	`HORAAPERTURA`			datetime, 
	`HORACIERRE`			datetime, 
	`CODADMINISTRACIONCAJA`			varchar (5), 
	`ULTIMORECIBOAPERTURA`			varchar (8), 
	`CODUSUARIOCIERRE`			varchar (6), 
	`ULTIMORECIBOCIERRE`			varchar (8)
);

-- CREATE INDEXES ...
ALTER TABLE `ADMINISTRACIONCAJA` ADD PRIMARY KEY (`CODADMINISTRACIONCAJA`);

CREATE TABLE `BANCOS`
 (
	`CODBANCO`			varchar (2), 
	`DESCRIPCION`			varchar (50), 
	`CODCIUDAD`			varchar (4), 
	`DIRECCION`			varchar (50), 
	`TELEFONO`			varchar (50)
);

-- CREATE INDEXES ...
ALTER TABLE `BANCOS` ADD PRIMARY KEY (`CODBANCO`);

CREATE TABLE `CHEQUES`
 (
	`COBRADO`			smallint, 
	`CODCHEQUE`			varchar (5), 
	`CODBANCO`			varchar (2), 
	`NUMEROCHEQUE`			varchar (15), 
	`FECHAEMISION`			datetime, 
	`FECHACOBROEFECTIVO`			datetime, 
	`IMPORTE`			float, 
	`FECHAVENCIMIENTO`			datetime, 
	`TITULAR`			varchar (50)
);

-- CREATE INDEXES ...
ALTER TABLE `CHEQUES` ADD PRIMARY KEY (`CODCHEQUE`);

CREATE TABLE `CIUDADES`
 (
	`CPROVINCIA`			varchar (3), 
	`CIUDAD`			varchar (20), 
	`CPOSTAL`			varchar (4), 
	`CCIUDAD`			varchar (4)
);

-- CREATE INDEXES ...
ALTER TABLE `CIUDADES` ADD PRIMARY KEY (`CCIUDAD`);

CREATE TABLE `CLASIFICACIONPERSONAS`
 (
	`CODCLASIFICACION`			varchar (1), 
	`DESCRIPCION`			varchar (50)
);

-- CREATE INDEXES ...
ALTER TABLE `CLASIFICACIONPERSONAS` ADD PRIMARY KEY (`CODCLASIFICACION`);

CREATE TABLE `CLAVES`
 (
	`CLAVE`			varchar (5), 
	`CPERMISO`			varchar (3), 
	`CODUSUARIO`			varchar (6)
);

-- CREATE INDEXES ...
ALTER TABLE `CLAVES` ADD PRIMARY KEY (`CODUSUARIO`);

CREATE TABLE `CUENTAS`
 (
	`CODCUENTA`			varchar (2), 
	`INGEG`			varchar (1), 
	`DESCRIPCION`			varchar (50)
);

-- CREATE INDEXES ...
ALTER TABLE `CUENTAS` ADD PRIMARY KEY (`CODCUENTA`);

CREATE TABLE `CUENTASRECLASIFICADAS`
 (
	`CODCUENTA`			varchar (2), 
	`TOTAL`			float
);

-- CREATE INDEXES ...
ALTER TABLE `CUENTASRECLASIFICADAS` ADD PRIMARY KEY (`CODCUENTA`);

CREATE TABLE `DETALLES`
 (
	`CODCUENTA`			varchar (2), 
	`MONTO`			float, 
	`CODFACTURA`			varchar (5), 
	`DESCRIPCION`			varchar (50)
);

-- CREATE INDEXES ...
ALTER TABLE `DETALLES` ADD INDEX `CODCUENTA` (`CODCUENTA`);
ALTER TABLE `DETALLES` ADD INDEX `CODFACTURA` (`CODFACTURA`);

CREATE TABLE `IVA`
 (
	`CIVA`			varchar (2), 
	`DESCRIP`			varchar (15)
);

-- CREATE INDEXES ...

CREATE TABLE `PARAMETROS`
 (
	`CTAEDEERSA`			varchar (2), 
	`CUIT`			varchar (13), 
	`CODCIUDAD`			varchar (4), 
	`DIRECCION`			varchar (50), 
	`TELEFONO`			varchar (50), 
	`DIRREPORTES`			varchar (200), 
	`FTEMPORAL`			datetime, 
	`UPDATEMANAGER`			datetime, 
	`PORCONSULTAS`			varchar (200), 
	`ARESULTADO`			boolean NOT NULL, 
	`IMPRESORA1`			varchar (50), 
	`IMPRESORA2`			varchar (50)
);

-- CREATE INDEXES ...

CREATE TABLE `PCHEQUESCAJA`
 (
	`CODFACTURA`			varchar (5), 
	`CODCHEQUE`			varchar (5)
);

-- CREATE INDEXES ...

CREATE TABLE `PERSONAS`
 (
	`COD_BARRA`			varchar (13), 
	`TDOC`			varchar (3), 
	`CODCIUDAD`			varchar (4), 
	`NUMERO_DOCUMENTO`			varchar (8), 
	`CODSTRIBUTARIA`			varchar (1), 
	`RAZONSOCIAL`			varchar (50), 
	`TELEFONO`			varchar (50), 
	`DOMICILIO`			varchar (50), 
	`EMAIL`			varchar (50), 
	`CUIX`			varchar (11), 
	`CODPERSONA`			varchar (4), 
	`CODCLASIFICACION`			varchar (1), 
	`OBSERVACIONES`			text, 
	`CODTDOCUMENTO`			varchar (1)
);

-- CREATE INDEXES ...
ALTER TABLE `PERSONAS` ADD PRIMARY KEY (`CODPERSONA`);

CREATE TABLE `PROVINCIAS`
 (
	`CPROVINCIA`			varchar (3), 
	`PROVINCIA`			varchar (20)
);

-- CREATE INDEXES ...
ALTER TABLE `PROVINCIAS` ADD PRIMARY KEY (`CPROVINCIA`);

CREATE TABLE `SCUENTAS`
 (
	`CODCUENTA`			varchar (2), 
	`CODSCUENTA`			varchar (2), 
	`DESCRIPCION`			varchar (30), 
	`PORCENTAJE`			float
);

-- CREATE INDEXES ...
ALTER TABLE `SCUENTAS` ADD PRIMARY KEY (`CODCUENTA`, `CODSCUENTA`);

CREATE TABLE `USUARIOS`
 (
	`NOMBRE`			varchar (25), 
	`CARGO`			varchar (20), 
	`CATEGORIA`			smallint, 
	`NICK`			varchar (10), 
	`DIRECCION`			varchar (50), 
	`DNI`			varchar (8), 
	`CODUSUARIO`			varchar (6)
);

-- CREATE INDEXES ...
ALTER TABLE `USUARIOS` ADD PRIMARY KEY (`CODUSUARIO`);

CREATE TABLE `FACTURAS`
 (
	`COMPROB`			varchar (2), 
	`NETO`			float, 
	`EXENTO`			float, 
	`IVA_1`			float, 
	`IVA_2`			float, 
	`IMP_1`			float, 
	`IMP_2`			float, 
	`CAJERO`			varchar (12), 
	`TCHEQUE`			float, 
	`CAJA`			varchar (4), 
	`TBONOS`			float, 
	`CODFACTURA`			varchar (5), 
	`NUMERO_FACTURA`			varchar (8), 
	`FECHA`			datetime, 
	`CODPERSONA`			varchar (4), 
	`TPESOS`			float
);

-- CREATE INDEXES ...
ALTER TABLE `FACTURAS` ADD PRIMARY KEY (`CODFACTURA`);
ALTER TABLE `FACTURAS` ADD UNIQUE INDEX `NUMERO_FACTURA` (`NUMERO_FACTURA`);

CREATE TABLE `T_DOCUMENTO`
 (
	`CODTDOCUMENTO`			varchar (1), 
	`DESCRIPCION`			varchar (50)
);

-- CREATE INDEXES ...
ALTER TABLE `T_DOCUMENTO` ADD PRIMARY KEY (`CODTDOCUMENTO`);


-- CREATE Relationships ...
-- relationships are not implemented for mysql
