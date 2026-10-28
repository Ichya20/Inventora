from pathlib import Path
import subprocess
import sys
sys.stdout.reconfigure(encoding='utf-8')
qa=Path('D:/Inventora/tmp/uml-docs-2026-10-28/qa')
for name in sys.argv[1:]:
    process=subprocess.Popen(['powershell','-NoProfile','-ExecutionPolicy','Bypass','-File','D:/Inventora/docs/uml-2026-10-28/quick_render.ps1','-TaskName',name],stdout=subprocess.PIPE,stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW)
    try:
        output=process.communicate(timeout=35)[0]
        print(output.decode('utf-8',errors='replace'),flush=True)
    except subprocess.TimeoutExpired:
        pidfile=qa/(name+'.pid')
        if pidfile.exists():
            word_pid=int(pidfile.read_text(encoding='utf-8-sig').strip())
            subprocess.run(['taskkill','/PID',str(word_pid),'/F'],stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
        process.kill()
        output=process.communicate()[0]
        print('TIMEOUT '+name+'\n'+output.decode('utf-8',errors='replace'),flush=True)
