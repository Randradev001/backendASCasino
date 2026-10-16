SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF OBJECT_ID('dbo.SSP06OPPedidosPlantaEntrega', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.SSP06OPPedidosPlantaEntrega (
    GECODEMP decimal(10,0) NOT NULL,
    PEDNumero decimal(10,0) NOT NULL,
    FechaHoraProgramada datetime NOT NULL,
    FechaHoraEntrega datetime NOT NULL,
    DiferenciaMinutos int NOT NULL,
    Cumplimiento varchar(12) NOT NULL,
    UsuLogin varchar(10) NOT NULL,
    FechaRegistro datetime2 NOT NULL,
    CONSTRAINT PK_SSP06OPPedidosPlantaEntrega PRIMARY KEY (GECODEMP, PEDNumero),
    CONSTRAINT FK_SSP06OPPedidosPlantaEntrega_Pedido FOREIGN KEY (GECODEMP, PEDNumero)
      REFERENCES dbo.SSP06OPPedidosPlanta (GECODEMP, PEDNumero),
    CONSTRAINT CK_SSP06OPPedidosPlantaEntrega_Cumplimiento CHECK (Cumplimiento IN ('ATIEMPO', 'ANTICIPADO', 'ATRASADO')),
    CONSTRAINT CK_SSP06OPPedidosPlantaEntrega_Diferencia CHECK (
      (Cumplimiento='ATIEMPO' AND DiferenciaMinutos=0) OR
      (Cumplimiento='ANTICIPADO' AND DiferenciaMinutos<0) OR
      (Cumplimiento='ATRASADO' AND DiferenciaMinutos>0)
    )
  );
END;

COMMIT TRANSACTION;

SELECT OBJECT_ID('dbo.SSP06OPPedidosPlantaEntrega', 'U') TablaEntrega,
       COUNT(*) EntregasRegistradas
FROM dbo.SSP06OPPedidosPlantaEntrega;
