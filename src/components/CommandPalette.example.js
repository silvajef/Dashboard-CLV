// Exemplo de construção dos `commands` para CommandPalette
// Cole isso em App.jsx (ou onde fizer sentido) — exemplo plug & play.

import { useMemo } from 'react'

export function useCommands({ setAba, fleet, openModal }) {
  return useMemo(() => {
    const cmds = []

    // ── Ações ─────────────────────────────────────────────
    cmds.push(
      { id: 'new-veiculo', icon: 'plus',      label: 'Novo veículo',
        hint: 'Adicionar ao estoque', section: 'Ações',
        action: () => openModal('veiculo:new') },
      { id: 'new-anuncio', icon: 'megaphone', label: 'Novo anúncio',
        hint: 'Publicar em marketplace', section: 'Ações',
        action: () => openModal('anuncio:new') },
      { id: 'export',      icon: 'download',  label: 'Exportar relatório',
        hint: 'CSV · PDF · planilha', section: 'Ações',
        action: () => openModal('export') },
    )

    // ── Navegação ─────────────────────────────────────────
    const navs = [
      ['dashboard',   'dashboard', 'KPIs'],
      ['veiculos',    'truck',     'Estoque'],
      ['anuncios',    'megaphone', 'Anúncios'],
      ['leads',       'target',    'Leads'],
      ['posvenda',    'shield',    'Pós-Venda'],
      ['prestadores', 'tools',     'Prestadores'],
      ['historico',   'list',      'Histórico'],
    ]
    navs.forEach(([id, icon, label]) => cmds.push({
      id: 'go-' + id, icon, label: 'Ir para ' + label, section: 'Navegação',
      action: () => setAba(id),
    }))

    // ── Veículos (busca direta) ───────────────────────────
    fleet.veiculos.forEach(v => cmds.push({
      id: 'v-' + v.id, icon: 'truck',
      label: `${v.marca} ${v.modelo}`,
      hint: `${v.placa} · ${v.tipo}`,
      section: 'Veículos',
      action: () => { setAba('veiculos'); openModal('veiculo:' + v.id) },
    }))

    return cmds
  }, [fleet.veiculos, setAba, openModal])
}

// USO em App.jsx:
//   const commands = useCommands({ setAba, fleet, openModal: setModalOpen })
//   return <>
//     ...
//     <CommandPalette commands={commands}/>
//   </>
//
// Para abrir programaticamente de qualquer lugar:
//   window.dispatchEvent(new CustomEvent('clv:palette'))
