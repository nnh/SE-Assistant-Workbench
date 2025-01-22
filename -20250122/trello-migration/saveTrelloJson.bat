@echo on
setlocal enabledelayedexpansion

for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set year=%datetime:~0,4%
set month=%datetime:~4,2%
set day=%datetime:~6,2%
set todayDir=%year%%month%%day%
echo %todayDir%

mkdir C:\Users\MarikoOhtsuka\Box\Datacenter\ISR\trello_backup\%todayDir%

move "C:\Users\MarikoOhtsuka\Downloads\4MkaVaOO.json" "C:\Users\MarikoOhtsuka\Box\Datacenter\ISR\trello_backup\%todayDir%\Admin.json"
move "C:\Users\MarikoOhtsuka\Downloads\bcwdY8uR.json" "C:\Users\MarikoOhtsuka\Box\Datacenter\ISR\trello_backup\%todayDir%\ISR.json"
move "C:\Users\MarikoOhtsuka\Downloads\mZBNzA8z.json" "C:\Users\MarikoOhtsuka\Box\Datacenter\ISR\trello_backup\%todayDir%\STAT.json"
move "C:\Users\MarikoOhtsuka\Downloads\B0GKqWCd.json" "C:\Users\MarikoOhtsuka\Box\Datacenter\ISR\trello_backup\%todayDir%\Team E.json"
move "C:\Users\MarikoOhtsuka\Downloads\vVgqf7VT.json" "C:\Users\MarikoOhtsuka\Box\Datacenter\ISR\trello_backup\%todayDir%\Team I.json"
move "C:\Users\MarikoOhtsuka\Downloads\4X3f4xen.json" "C:\Users\MarikoOhtsuka\Box\Datacenter\ISR\trello_backup\%todayDir%\Team M.json"
move "C:\Users\MarikoOhtsuka\Downloads\NXJENzmH.json" "C:\Users\MarikoOhtsuka\Box\Datacenter\ISR\trello_backup\%todayDir%\Team Y.json"
