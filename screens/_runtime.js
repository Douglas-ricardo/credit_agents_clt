/* Crédito do Trabalhador — sem leilão · código compartilhado por todas as telas.
   Estado entre telas, dados de exemplo (determinísticos), máscaras e validações
   reais, motor financeiro e comportamento dos componentes (drawer, alert dialog,
   toast, tabs). Nada aqui chama API de verdade: onde o app real chamaria a
   Celcoin, o comentário diz qual endpoint. */
(function () {
  "use strict";
  var CFG = window.CT_CFG || {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ------------------------------------------------------------ estado */
  var KEY = "ctw.v1";
  function load() {
    return JSON.parse(JSON.stringify(window.__SEED || {}));
  }
  var state = load();
  state.persona = state.persona || { margem: "duas", identidade: "aprovada", historico: "nenhuma", conta: "tomador", pagamentos: "off" };
  /* Cenário adicionado depois: garante o padrão em quem já tinha estado salvo. */
  if (!state.persona.conta) state.persona.conta = "tomador";
  if (!state.persona.pagamentos) state.persona.pagamentos = "off";
  function save() {
    /* estado só em memória */
  }
  var Store; Store = {
    get: function (k) { return state[k]; },
    set: function (k, v) { state[k] = v; save(); },
    persona: function () { return state.persona; },
    setPersona: function (k, v) { state.persona[k] = v; save(); },
    /* descarta a solicitação em curso, mantém marca, persona e propostas */
    novaSolicitacao: function () {
      ["consent", "ofertaId", "sim", "resumo", "cadastro", "endereco", "banco", "assinarId"].forEach(function (k) { delete state[k]; });
      save();
    },
    reset: function () { state = { persona: { margem: "duas", identidade: "aprovada", historico: "nenhuma", conta: "tomador", pagamentos: "off" } }; },
  };

  /* ------------------------------------------------------------ utilidades */
  var dig = function (v) { return String(v || "").replace(/\D/g, ""); };
  function brl(n) { return (n < 0 ? "-" : "") + "R$ " + Math.abs(n).toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, "."); }
  function pct(n, casas) { return (n * 100).toFixed(casas == null ? 2 : casas).replace(".", ",") + "%"; }
  var MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  var MES3 = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  function d0(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function iso(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function fromIso(s) { var p = s.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function dataLonga(d) { return d.getDate() + " de " + MESES[d.getMonth()] + " de " + d.getFullYear(); }
  function dataCurta(d) { return String(d.getDate()).padStart(2, "0") + "/" + String(d.getMonth() + 1).padStart(2, "0") + "/" + d.getFullYear(); }
  function dataMes(d) { return String(d.getDate()).padStart(2, "0") + " " + MES3[d.getMonth()] + " " + d.getFullYear(); }
  function dias(a, b) { return Math.round((d0(b) - d0(a)) / 86400000); }

  /* ------------------------------------------------------------ validações */
  function isCPF(v) {
    var c = dig(v); if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
    for (var t = 9; t < 11; t++) { var s = 0; for (var i = 0; i < t; i++) s += +c[i] * (t + 1 - i); var r = (s * 10) % 11 % 10; if (r !== +c[t]) return false; }
    return true;
  }
  function cpfDe(base9) { var c = base9; for (var t = 9; t < 11; t++) { var s = 0; for (var i = 0; i < t; i++) s += +c[i] * (t + 1 - i); c += (s * 10) % 11 % 10; } return c; }
  function maskCPF(v) { return dig(v).slice(0, 11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2"); }
  function isEmail(v) { return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(String(v).trim()); }
  function maskCEP(v) { return dig(v).slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2"); }
  function maskFone(v) { var d = dig(v).slice(0, 11); if (d.length <= 2) return d.length ? "(" + d : ""; if (d.length <= 7) return "(" + d.slice(0, 2) + ") " + d.slice(2); return "(" + d.slice(0, 2) + ") " + d.slice(2, 7) + "-" + d.slice(7); }
  function isCelular(v) { var d = dig(v); return d.length === 11 && /^[1-9][1-9]9/.test(d); }
  function isUUID(v) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(v).trim()); }
  function maskMoney(v) { var d = dig(v).replace(/^0+/, "").slice(0, 9); if (!d) return ""; return brl(+d / 100); }
  function parseMoney(v) { var d = dig(v); return d ? +d / 100 : 0; }
  function nomeValido(v) { var s = String(v).trim(); return /^[A-Za-zÀ-ÿ' ]+$/.test(s) && s.split(/\s+/).filter(function (p) { return p.length > 1; }).length >= 2; }

  /* Chave Pix por key_type da API: TAXPAYER_ID | EMAIL | PHONE_NUMBER | ALEATORY_KEY */
  var PIX = {
    TAXPAYER_ID: { rot: "CPF", ph: "000.000.000-00", mode: "numeric", mask: maskCPF, ok: isCPF, erro: "CPF inválido. Confira os 11 números." },
    EMAIL: { rot: "E-mail", ph: "nome@exemplo.com.br", mode: "email", mask: function (v) { return v.trim(); }, ok: isEmail, erro: "E-mail inválido. Use o formato nome@dominio.com." },
    /* O erro diz qual das três regras quebrou. A mensagem única de antes */
    /* ("informe DDD + 9 dígitos") aparecia mesmo com 11 dígitos digitados, e */
    /* não contava o que falta de verdade: o 9 depois do DDD. */
    PHONE_NUMBER: {
      rot: "Telefone", ph: "(00) 90000-0000", mode: "tel", mask: maskFone, ok: isCelular,
      erro: function (v) {
        var d = dig(v);
        if (d.length < 11) return "Celular incompleto. São 11 números: DDD + 9 dígitos.";
        if (!/^[1-9][1-9]/.test(d)) return "DDD inválido. Confira os dois primeiros números.";
        return "Depois do DDD, o número do celular começa com 9.";
      },
    },
    ALEATORY_KEY: { rot: "Chave aleatória", ph: "00000000-0000-0000-0000-000000000000", mode: "text", mask: function (v) { return v.trim().toLowerCase(); }, ok: isUUID, erro: "Chave aleatória inválida. São 32 caracteres no formato 8-4-4-4-12." },
  };

  /* ------------------------------------------------------------ dados de exemplo */
  /* Tomador vem da sessão do app parceiro (whitelabel): nome, CPF, celular e */
  /* nascimento já são conhecidos — por isso o Figma não pede nenhum deles. */
  var TOMADOR = { nome: "Marina Alves Costa", primeiro: "Marina", cpf: cpfDe("418305297"), celular: "11987654321", nascimento: "1991-05-14" };
  /* No white label o provedor de assinatura é fixo: a Único. Quem integra */
  /* direto por API pode usar ClickSign ou ZapSign, mas aí não usa este front — */
  /* e cada provedor tem um comportamento de jornada diferente (a Único devolve */
  /* uma URL com o fluxo dela; as outras mandam link por e-mail). Fixar aqui é o */
  /* que permite a jornada ter uma etapa só de assinatura. */
  var PROVEDOR_ASSINATURA = { id: "UNICO", nome: "Único", autenticacao: "DOC_SIGN" };

  /* Conta de desembolso enviada pelo originador quando a jornada roda embedada */
  /* no app dele (cenário ?conta=originador). O tomador não pode alterar. */
  var CONTA_ORIGINADOR = { banco: "033", agencia: "1234", conta: "00045678-9", tipo: "CACC", pixTipo: "TAXPAYER_ID", nomeOriginador: "Banco Exemplo S.A." };

  /* Um item por vínculo em links[] de GET /guarantee/{product_id}/get-balance. */
  /* Taxa e prazo máximo NÃO vêm da margem: são do produto/originador (hipótese registrada no STYLE.md). */
  var OFERTAS = [
    { id: "vinc-1", empregador: "Mercado Horizonte Ltda.", cnpj: "12.345.678/0001-90", matricula: "004817", admissao: "2019-03-11", margem: 480, taxa: 0.0199, prazoMax: 72 },
    { id: "vinc-2", empregador: "Transportes Vale Azul S.A.", cnpj: "98.765.432/0001-10", matricula: "118203", admissao: "2022-08-01", margem: 210, taxa: 0.0235, prazoMax: 48 },
  ];
  function ofertasDaPersona() { var m = state.persona.margem; return m === "sem" ? [] : m === "uma" ? OFERTAS.slice(0, 1) : OFERTAS.slice(); }
  function ofertaAtual() { var id = state.ofertaId; return OFERTAS.filter(function (o) { return o.id === id; })[0] || null; }
  var PARCELA_MIN = 30; /* valor mínimo de parcela exibido no Figma — confirmar com Implantação */

  /* ------------------------------------------------------------ motor financeiro */
  /* Calendário Dataprev: desembolso até o dia 20 → 1º vencimento em 28 de M+2; */
  /* a partir do dia 21 → 28 de M+3 (docs: modalidade-sem-leilao / consulta-de-margem). */
  function primeiroVencimento(desemb) { var add = desemb.getDate() <= 20 ? 2 : 3; return new Date(desemb.getFullYear(), desemb.getMonth() + add, 28); }
  /* Janela de virada de competência: dia 20 às 22h até dia 23 às 6h (Brasília). */
  function janelaDataprev(now) { var d = now.getDate(), h = now.getHours(); return (d === 20 && h >= 22) || d === 21 || d === 22 || (d === 23 && h < 6); }

  /* Âncora payment_value (valor da parcela) — exatamente uma âncora por preview. */
  function simular(pmt, n, taxa, desemb) {
    desemb = d0(desemb || new Date());
    var p1 = primeiroVencimento(desemb), datas = [], t = [];
    for (var k = 0; k < n; k++) { var d = new Date(p1.getFullYear(), p1.getMonth() + k, 28); datas.push(d); t.push(dias(desemb, d)); }
    var fin = 0; for (k = 0; k < n; k++) fin += pmt / Math.pow(1 + taxa, t[k] / 30);
    fin = Math.round(fin * 100) / 100;
    var saldo = fin, prev = desemb, iof = fin * 0.0038, sched = [];
    for (k = 0; k < n; k++) {
      var dd = dias(prev, datas[k]);
      var juros = saldo * (Math.pow(1 + taxa, dd / 30) - 1);
      var amort = k === n - 1 ? saldo : pmt - juros;
      saldo = Math.max(0, saldo - amort);
      iof += amort * 0.000082 * Math.min(t[k], 365);
      sched.push({ n: k + 1, data: datas[k], parcela: pmt, juros: juros, amort: amort, saldo: saldo });
      prev = datas[k];
    }
    iof = Math.round(iof * 100) / 100;
    var liberado = Math.round((fin - iof) * 100) / 100;
    /* CET mensal: TIR do fluxo liberado × parcelas nas datas reais. */
    var lo = 0, hi = 1;
    for (var it = 0; it < 80; it++) {
      var mid = (lo + hi) / 2, pv = 0;
      for (k = 0; k < n; k++) pv += pmt / Math.pow(1 + mid, t[k] / 30);
      if (pv > liberado) lo = mid; else hi = mid;
    }
    var cet = (lo + hi) / 2;
    return {
      parcela: pmt, n: n, taxa: taxa, taxaAno: Math.pow(1 + taxa, 12) - 1,
      financiado: fin, iof: iof, liberado: liberado, total: Math.round(pmt * n * 100) / 100,
      cet: cet, cetAno: Math.pow(1 + cet, 12) - 1,
      /* Limite legal: CET mensal ≤ taxa de juros + 1 p.p. (validado no preview e na CCB). */
      cetOk: cet <= taxa + 0.01,
      desembolso: desemb, primeira: datas[0], ultima: datas[n - 1], cronograma: sched,
      validaAte: new Date(desemb.getFullYear(), desemb.getMonth(), desemb.getDate(), 23, 59),
    };
  }

  /* ------------------------------------------------------------ propostas (Home) */
  function exemplos() {
    var hoje = d0(new Date());
    var mk = function (id, status, pmt, n, taxa, pagas, mesesAtras) {
      var em = new Date(hoje.getFullYear(), hoje.getMonth() - mesesAtras, 5);
      var s = simular(pmt, n, taxa, em);
      /* Emitidos: parcelas pagas = vencimentos já passados (coerente com a data de hoje). */
      if (status === "ISSUED") pagas = s.cronograma.filter(function (c) { return c.data < hoje; }).length;
      return { id: id, ccb: id, status: status, emitidaEm: iso(em), empregador: OFERTAS[0].empregador, parcela: pmt, n: n, taxa: taxa, pagas: pagas,
        financiado: s.financiado, liberado: s.liberado, iof: s.iof, cet: s.cet, cetAno: s.cetAno, total: s.total, primeira: iso(s.primeira), exemplo: true };
    };
    return [
      mk("550293841", "PENDING_SIGNATURE", 180, 24, 0.0199, 0, 0),
      mk("550187302", "PENDING_GUARANTEE", 150, 36, 0.0199, 0, 0),
      mk("549903117", "ISSUED", 220, 12, 0.0215, 4, 7),
      mk("548120559", "ISSUED", 95, 6, 0.0215, 6, 11),
      mk("547761020", "CANCELED", 300, 48, 0.0199, 0, 3),
    ];
  }
  function propostas() {
    var minhas = state.propostas || [], over = state.statusOver || {};
    return minhas.concat(state.persona.historico === "exemplos" ? exemplos() : []).map(function (p) {
      if (over[p.id]) p.status = over[p.id];
      return p;
    });
  }
  /* Registra o desfecho da jornada na Home (a nova proposta, ou a assinatura de uma pendente). */
  function registrar(status) {
    var id = state.assinarId;
    if (id) { state.statusOver = state.statusOver || {}; state.statusOver[id] = status; save(); return id; }
    var of = ofertaAtual(), sim = state.sim, r = state.resumo; if (!of || !sim || !r) return null;
    var ccb = String(551000000 + Math.floor((Date.now() / 1000) % 999999));
    var p = { id: ccb, ccb: ccb, status: status, emitidaEm: iso(new Date()), empregador: of.empregador, parcela: sim.parcela, n: sim.n, taxa: r.taxa, pagas: 0,
      financiado: r.financiado, liberado: r.liberado, iof: r.iof, cet: r.cet, cetAno: r.cetAno, total: r.total, primeira: r.primeira };
    state.propostas = [p].concat(state.propostas || []); save();
    return ccb;
  }
  /* Rótulos de front oficiais da doc "status-da-operação". */
  var STATUS = {
    AGREEMENT_RENDERING: { rot: "Gerando contrato", v: "info", grupo: "pendente" },
    KYC_PROCESSING: { rot: "Pendente KYC", v: "info", grupo: "pendente" },
    PENDING_SIGNATURE: { rot: "Pendente de assinatura", v: "warning", grupo: "pendente" },
    SIGNATURE_ERROR: { rot: "Erro na assinatura", v: "destructive", grupo: "pendente" },
    PENDING_GUARANTEE: { rot: "Pendente de averbação", v: "info", grupo: "pendente" },
    PENDING_DISBURSEMENT: { rot: "Pendente desembolso", v: "info", grupo: "pendente" },
    DISBURSEMENT_ATTEMPT_FAILED: { rot: "Falha no pagamento", v: "destructive", grupo: "pendente" },
    ISSUED: { rot: "Emitido", v: "success", grupo: "ativo" },
    CANCELED: { rot: "Cancelado", v: "outline", grupo: "finalizado" },
  };
  function grupoDe(p) { if (p.status === "ISSUED" && p.pagas >= p.n) return "finalizado"; return (STATUS[p.status] || {}).grupo || "pendente"; }

  /* ------------------------------------------------------------ componentes */
  var lastFocus = null;
  function overlayOf(id) { return $('[data-close="' + id + '"][data-slot$="overlay"]'); }
  function open(id) {
    var el = document.getElementById(id); if (!el) return;
    lastFocus = document.activeElement;
    el.setAttribute("data-state", "open"); document.body.setAttribute("data-modal", "true");
    var ov = overlayOf(id); if (ov) ov.setAttribute("data-state", "open");
    var f = $("[autofocus], input, button, [href]", el);
    setTimeout(function () { if (f) f.focus({ preventScroll: true }); }, 60);
    el.dispatchEvent(new CustomEvent("ct:open"));
  }
  function close(id) {
    var el = document.getElementById(id); if (!el || el.getAttribute("data-state") !== "open") return;
    el.setAttribute("data-state", "closed"); document.body.removeAttribute("data-modal");
    var ov = overlayOf(id); if (ov) ov.setAttribute("data-state", "closed");
    el.dispatchEvent(new CustomEvent("ct:close"));
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  document.addEventListener("click", function (e) {
    var o = e.target.closest("[data-open]"); if (o) { e.preventDefault(); open(o.getAttribute("data-open")); return; }
    var c = e.target.closest("[data-close]"); if (c) { e.preventDefault(); close(c.getAttribute("data-close")); }
  });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    var o = $$('[data-state="open"][role="dialog"], [data-state="open"][role="alertdialog"]').pop();
    if (o) close(o.id);
  });

  var toastT;
  function toast(msg) {
    var t = $("#ct-toast"); $("#ct-toast-msg").textContent = msg;
    t.setAttribute("data-state", "open"); clearTimeout(toastT);
    toastT = setTimeout(function () { t.setAttribute("data-state", "closed"); }, 4200);
  }

  /* Checkbox / Switch / Radio do DS: estado em data-state, como o Radix. */
  function bindCheck(el, onChange) {
    function set(v) {
      el.setAttribute("aria-checked", String(v)); el.setAttribute("data-state", v ? "checked" : "unchecked");
      var th = $('[data-slot="switch-thumb"]', el); if (th) th.setAttribute("data-state", v ? "checked" : "unchecked");
      var ind = $('[data-slot="checkbox-indicator"]', el); if (ind) ind.hidden = !v;
      if (onChange) onChange(v);
    }
    el.addEventListener("click", function () { set(el.getAttribute("aria-checked") !== "true"); });
    el.addEventListener("keydown", function (e) { if (e.key === " " && el.tagName !== "BUTTON") { e.preventDefault(); el.click(); } });
    return { set: set, get: function () { return el.getAttribute("aria-checked") === "true"; } };
  }

  /* Campo com validação real: neutro → válido/inválido, mensagem específica. */
  function campo(opts) {
    var el = typeof opts.el === "string" ? document.getElementById(opts.el) : opts.el;
    var view = opts.view ? document.getElementById(opts.view) : el; /* o que recebe o estado visual */
    var wrap = el.closest('[data-slot="field"]');
    var err = opts.errEl ? document.getElementById(opts.errEl) : wrap && $('[data-slot="field-error"]', wrap);
    var touched = !!el.value;
    var api = {
      el: el,
      erro: function () { var v = el.value; if (!String(v).trim()) return opts.optional ? "" : (opts.vazio || "Campo obrigatório."); return opts.check ? opts.check(v) || "" : ""; },
      ok: function () { return !api.erro(); },
      paint: function (force) {
        var e = api.erro(), show = (touched || force) && (String(el.value).trim() || force);
        view.setAttribute("aria-invalid", show && e ? "true" : "false");
        view.setAttribute("data-valid", show && !e && String(el.value).trim() ? "true" : "false");
        if (wrap) wrap.setAttribute("data-invalid", show && e ? "true" : "false");
        if (err) { err.textContent = show && e ? e : ""; err.hidden = !(show && e); }
      },
      touch: function () { touched = true; api.paint(); },
    };
    el.addEventListener("input", function () {
      if (opts.mask) { var p = el.value; el.value = opts.mask(el.value); if (p !== el.value && el.setSelectionRange && el.type !== "email") el.setSelectionRange(el.value.length, el.value.length); }
      if (touched || api.ok()) api.paint();
      if (opts.onInput) opts.onInput(el.value);
      form.update();
    });
    el.addEventListener("change", function () { touched = true; api.paint(); form.update(); });
    el.addEventListener("blur", function () { touched = true; api.paint(); });
    if (view !== el) view.addEventListener("ct:dismiss", function () { touched = true; api.paint(); });
    if (el.value) api.paint();
    if (opts.form !== false) form.fields.push(api);
    return api;
  }
  /* Seletor em bottom sheet (padrão DrawerPicker do DS, sem busca): no mobile
     a lista abre num modal de baixo, não no próprio campo. */
  function picker(opts) {
    var input = document.getElementById(opts.el), trig = document.getElementById(opts.view);
    var lbl = $("[data-picker-label]", trig), escolheu = false;
    function paint() {
      var o = opts.options.filter(function (x) { return x.v === input.value; })[0];
      lbl.textContent = o ? o.l : opts.placeholder || "Selecione";
      lbl.classList.toggle("text-muted-foreground", !o);
    }
    function set(v) { input.value = v; paint(); input.dispatchEvent(new Event("change", { bubbles: true })); }
    trig.addEventListener("click", function () {
      var sheet = $("#ct-picker"), list = $("#ct-picker-lista", sheet), tpl = $("#tpl-picker-opt").content, ok = $("#ct-picker-ok");
      var marcado = input.value, itens = [];
      $("#ct-picker-t").textContent = opts.title;
      list.innerHTML = ""; escolheu = false;
      function pintar() {
        itens.forEach(function (b) { var on = b.getAttribute("data-v") === marcado; b.setAttribute("aria-checked", String(on)); b.tabIndex = on || (!marcado && b === itens[0]) ? 0 : -1; });
        ok.disabled = !marcado;
      }
      opts.options.forEach(function (o, i) {
        var b = tpl.firstElementChild.cloneNode(true);
        b.setAttribute("data-v", o.v);
        $("[data-f=l]", b).textContent = o.l;
        var d = $("[data-f=d]", b); if (o.d) d.textContent = o.d; else d.remove();
        b.addEventListener("click", function () { marcado = o.v; pintar(); });
        b.addEventListener("keydown", function (e) {
          var k = { ArrowDown: 1, ArrowUp: -1 }[e.key]; if (!k) return; e.preventDefault();
          var n = itens[(i + k + itens.length) % itens.length]; marcado = n.getAttribute("data-v"); pintar(); n.focus();
        });
        itens.push(b); list.appendChild(b);
      });
      pintar();
      ok.onclick = function () { if (!marcado) return; escolheu = true; set(marcado); close("ct-picker"); if (opts.onChange) opts.onChange(marcado); };
      /* Tocar fora do modal (overlay) mantém o que foi marcado na lista; só "Voltar" descarta. */
      var overlay = $('[data-slot="drawer-overlay"][data-close="ct-picker"]');
      var fora = function () {
        if (marcado && marcado !== input.value) { escolheu = true; set(marcado); if (opts.onChange) opts.onChange(marcado); }
      };
      overlay.addEventListener("click", fora, true);
      var onClose = function () {
        sheet.removeEventListener("ct:close", onClose); overlay.removeEventListener("click", fora, true);
        if (!escolheu) trig.dispatchEvent(new CustomEvent("ct:dismiss"));
      };
      sheet.addEventListener("ct:close", onClose);
      open("ct-picker");
      var sel = itens.filter(function (b) { return b.getAttribute("data-v") === marcado; })[0];
      if (sel) setTimeout(function () { sel.scrollIntoView({ block: "nearest" }); }, 80);
    });
    paint();
    return { set: set, paint: paint };
  }

  /* CTA primário: habilitado só quando todos os campos (e regras extras) valem. */
  var form = { fields: [], extras: [], cta: null,
    update: function () {
      if (!form.cta) return;
      var ok = form.fields.every(function (f) { return f.ok(); }) && form.extras.every(function (f) { return f(); });
      form.cta.disabled = !ok;
    } };

  /* Botão com carregamento: trava duplo envio no instante do toque. */
  function carregando(btn, texto) {
    btn.disabled = true; btn.setAttribute("aria-busy", "true");
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-slot="spinner" role="status" aria-label="Carregando" class="size-4 animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>' + (texto || "");
  }

  /* ------------------------------------------------------------ chrome */
  function go() { /* tela isolada: sem navegação entre telas */ }
  function header() {
    var h = $("[data-ct-header]"); if (!h) return;
    if (CFG.stepLabel) $("[data-ct-step-label]", h).textContent = CFG.stepLabel;
    var cnt = $("[data-ct-step-count]", h); if (!cnt) { $$("[data-ct-back]").forEach(function (b) { b.href = CFG.back || CFG.home; }); return; } cnt.textContent = CFG.step + "/" + CFG.total;
    var bar = $('[data-slot="progress"]', h), ind = $('[data-slot="progress-indicator"]', h);
    var v = Math.round((CFG.step / CFG.total) * 100), prevV = Math.round(((CFG.step - 1) / CFG.total) * 100);
    /* Mesmos atributos que o StepProgress do DS põe no contêiner. */
    var sp = $('[data-slot="step-progress"]', h);
    sp.setAttribute("aria-valuenow", CFG.step); sp.setAttribute("aria-valuemax", CFG.total);
    sp.setAttribute("aria-label", "Etapa " + CFG.step + " de " + CFG.total + ": " + $("[data-ct-step-label]", h).textContent);
    ind.style.transform = "translateX(-" + (100 - prevV) + "%)";
    requestAnimationFrame(function () { requestAnimationFrame(function () { ind.style.transform = "translateX(-" + (100 - v) + "%)"; }); });
    $$("[data-ct-back]").forEach(function (b) { b.href = CFG.back || CFG.home; });
  }
  function footerElevation() {
    var sc = $(".app-scroll"), ft = $(".app-footer"); if (!sc || !ft) return;
    var tt = $("[data-ct-title]");
    var f = function () {
      ft.setAttribute("data-elevated", String(sc.scrollHeight - sc.scrollTop - sc.clientHeight > 2));
      if (tt) tt.setAttribute("data-elevated", String(sc.scrollTop > 2));
    };
    sc.addEventListener("scroll", f, { passive: true }); window.addEventListener("resize", f); setTimeout(f, 50);
  }
  /* Cenários alternativos (sem controles na tela): ?margem=uma|sem, ?identidade=recusada,
     ?historico=exemplos, ?conta=originador, ?pagamentos=on em qualquer tela — fica gravado para as próximas. */
  function cenarios() {
    var q = new URLSearchParams(window.__Q || "");
    ["margem", "identidade", "historico", "conta", "pagamentos"].forEach(function (k) { if (q.get(k)) Store.setPersona(k, q.get(k)); });
    if (q.has("reiniciar")) Store.reset();
    var ok = $("#ct-cancelar-ok"); if (ok) ok.addEventListener("click", function () { Store.novaSolicitacao(); go(CFG.home); });
  }

  document.addEventListener("DOMContentLoaded", function () {
    /* logo: studio-branding no próprio markup */
    $$("[data-nome]").forEach(function (n) { n.textContent = TOMADOR.primeiro; });
    header(); footerElevation();
    requestAnimationFrame(function () { $("#app").classList.add("is-in"); });
  });

  cenarios();
  window.CT = {
    cfg: CFG, $: $, $$: $$, Store: Store, go: go, open: open, close: close, toast: toast,
    bindCheck: bindCheck, campo: campo, picker: picker, form: form, carregando: carregando,
    dig: dig, brl: brl, pct: pct, iso: iso, fromIso: fromIso, dataLonga: dataLonga, dataCurta: dataCurta, dataMes: dataMes,
    isCPF: isCPF, maskCPF: maskCPF, isEmail: isEmail, maskCEP: maskCEP, maskFone: maskFone, maskMoney: maskMoney, parseMoney: parseMoney, nomeValido: nomeValido, PIX: PIX,
    TOMADOR: TOMADOR, PROVEDOR_ASSINATURA: PROVEDOR_ASSINATURA, CONTA_ORIGINADOR: CONTA_ORIGINADOR, OFERTAS: OFERTAS, ofertasDaPersona: ofertasDaPersona, ofertaAtual: ofertaAtual, PARCELA_MIN: PARCELA_MIN,
    simular: simular, primeiroVencimento: primeiroVencimento, janelaDataprev: janelaDataprev,
    propostas: propostas, registrar: registrar, STATUS: STATUS, grupoDe: grupoDe,
  };
})();
