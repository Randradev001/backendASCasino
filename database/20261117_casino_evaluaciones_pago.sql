SET NOCOUNT ON;
SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF OBJECT_ID('dbo.SSP06OPPedidosPlantaPagoHistorial','U') IS NULL
BEGIN
  CREATE TABLE dbo.SSP06OPPedidosPlantaPagoHistorial (
    GECODEMP decimal(10,0) NOT NULL,
    PEDNumero decimal(10,0) NOT NULL,
    Secuencia int IDENTITY(1,1) NOT NULL,
    EstadoAnterior smallint NOT NULL,
    EstadoNuevo smallint NOT NULL,
    Motivo varchar(200) NULL,
    Origen varchar(20) NOT NULL,
    UsuLogin varchar(10) NOT NULL,
    FechaRegistro datetime2 NOT NULL,
    CONSTRAINT PK_SSP06OPPedidosPlantaPagoHistorial PRIMARY KEY (GECODEMP,PEDNumero,Secuencia),
    CONSTRAINT FK_SSP06OPPedidosPlantaPagoHistorial_Pedido FOREIGN KEY (GECODEMP,PEDNumero) REFERENCES dbo.SSP06OPPedidosPlanta(GECODEMP,PEDNumero),
    CONSTRAINT CK_SSP06OPPedidosPlantaPagoHistorial_Estados CHECK (EstadoAnterior IN (0,1,2) AND EstadoNuevo IN (1,2)),
    CONSTRAINT CK_SSP06OPPedidosPlantaPagoHistorial_Origen CHECK (Origen IN ('EVALUACION','CASINO'))
  );
END;

COMMIT TRANSACTION;
SELECT OBJECT_ID('dbo.SSP06OPPedidosPlantaPagoHistorial','U') TablaPagoHistorial;
