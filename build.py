# Gera app/*.html a partir das telas do Studio (screens/NN.html), ligando a navegação.
import re, json, os
N = {'00':'autorizacao','02':'ofertas','04':'simulacao','05':'resumo','06':'cadastro','07':'endereco',
     '01':'consultando','03':'sem-margem','12':'recusada','08':'bancarios','09':'identidade','10':'validando','11':'recebida','13':'meus-emprestimos','14':'contrato','15':'parcelas'}
F = lambda k: N[k]+'.html'
NEXT = {'00':'01','01':'02','03':'00','12':'00','02':'04','04':'05','05':'06','06':'07','07':'08','08':'09','09':'10'}
BACK = {'02':'00','04':'02','05':'04','06':'05','07':'06','08':'07','09':'08','14':'13','15':'13'}
LINKS = dict(next='#',sim=F('04'),ofertas=F('02'),sem=F('03'),ok=F('11'),recusada=F('12'),simular=F('00'),
             contrato=F('14'),assinar=F('10'),parcelas=F('15'),pagamento=F('15'))
os.makedirs('app', exist_ok=True)
for k, name in N.items():
    h = open(f'screens/{k}.html', encoding='utf-8').read()
    scripts = list(re.finditer(r'<script[^>]*>(.*?)</script>', h, re.S))
    s0, rt, s2 = scripts[0], scripts[1], scripts[2]
    cfg = json.loads(re.search(r'window.CT_CFG = (\{.*?\});\n', s0.group(1), re.S).group(1))
    links = dict(LINKS); links['next'] = F(NEXT[k]) if k in NEXT else '#'
    cfg['links'] = links
    cfg['back'] = F(BACK[k]) if k in BACK else None
    cfg['home'] = F('13') if cfg['fluxo']=='logada' or k in ('09','10','11') else F('00')
    if k in ('03','12'): cfg['home']=F('00')
    boot = ('window.__Q = location.search.slice(1);\n'
            'window.CT_CFG = %s;\n' % json.dumps(cfg))
    r = rt.group(1)
    r = re.sub(r'function go\(\)[^\n]*\n', 'function go(u) { if (u && u !== "#") location.href = u; }\n', r)
    r = r.replace('function load() {\n    return JSON.parse(JSON.stringify(window.__SEED || {}));',
                  'function load() {\n    try { var s = sessionStorage.getItem(KEY); if (s) return JSON.parse(s); } catch (e) {}\n    return {};')
    r = r.replace('/* estado só em memória */', 'try { sessionStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}')
    r = re.sub(r'/\* estado s.{1,3} em mem.{1,4}ria \*/', 'try { sessionStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}', r)
    h = h.replace(s0.group(0), '<script>\n'+boot+'</script>')
    h = h.replace(rt.group(0), '<script>\n'+r+'</script>')
    h = h.replace(s2.group(0), s2.group(0))
    # âncoras de ação que ficaram com "#"
    if k == '11': h = h.replace('href="#" data-slot="button"', 'href="%s" data-slot="button"' % F('13'), 1)
    if k == '13': h = h.replace('href="#" data-slot="button"', 'href="%s" data-slot="button"' % F('00'))
    if k == '14': h = h.replace('href="#" data-slot="button"', 'href="%s" data-slot="button"' % F('13'), 1)
    if k in ('03','12'): h = h.replace('href="#" data-slot="button"', 'href="%s" data-slot="button"' % F('00'))
    h = h.replace('<style data-studio-project-branding>', '<style data-studio-project-branding>', 1)
    open(f'app/{name}.html', 'w', encoding='utf-8').write(h)
open('app/index.html','w',encoding='utf-8').write('<meta http-equiv="refresh" content="0;url=%s">' % F('00'))
print('ok')
