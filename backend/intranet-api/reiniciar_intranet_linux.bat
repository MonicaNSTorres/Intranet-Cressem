@echo off
title Reiniciando Intranet Cressem

color 0A

echo.
echo ================================================
echo         REINICIANDO INTRANET CRESSEM
echo ================================================
echo.

ssh root@10.0.107.231 "/home/tecnologia/scripts/reiniciar-intranet.sh"

echo.
echo ================================================
echo        PROCESSO FINALIZADO
echo ================================================
echo.

pause