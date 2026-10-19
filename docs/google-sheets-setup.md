# Integração com Google Sheets

1. Crie uma planilha no Google Sheets (ex.: "Leads Site Dr. Phelype").
2. Menu **Extensões → Apps Script**. Apague o código e cole o conteúdo de `docs/apps-script.gs`. Salve.
3. **Implantar → Nova implantação → tipo "App da Web"**:
   - Executar como: **Eu**
   - Quem tem acesso: **Qualquer pessoa**
4. Autorize as permissões e copie a **URL do app da Web** (termina em `/exec`).
5. Em `assets/lead-modal.js`, cole a URL em `SHEETS_URL`.
6. Publique o site. Ao alterar o script depois, use **Implantar → Gerenciar implantações → editar → nova versão** (a URL se mantém).

A aba "Leads" e o cabeçalho (Data/Hora, Nome, WhatsApp, Página, Origem) são criados automaticamente no primeiro envio.
