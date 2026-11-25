using Zpovednice.Api.Models;

namespace Zpovednice.Api.Services;

public static class CoupleCardCatalog
{
    public static readonly IReadOnlyList<DesireCardDto> All =
    [
        // Polarity Pair 1: Leading vs. Surrendering
        new(
            Id: "lead_hour",
            Category: "Polarita",
            Title: "Hodina absolutního velení",
            Prompt: "Chci dnes na hodinu převzít vedení a rozhodovat o světle, tempu i každém doteku.",
            SpiceLevel: 2,
            ComplementaryCardId: "surrender_hour",
            PolarityLabel: "Magnetická polarita: Velení × Odevzdání"
        ),
        new(
            Id: "surrender_hour",
            Category: "Polarita",
            Title: "Odevzdání kontroly",
            Prompt: "Chci dnes na hodinu úplně pustit kontrolu a plně se svěřit do rukou partnera.",
            SpiceLevel: 2,
            ComplementaryCardId: "lead_hour",
            PolarityLabel: "Magnetická polarita: Velení × Odevzdání"
        ),

        // Polarity Pair 2: Blindfold Giver vs. Receiver
        new(
            Id: "blindfold_give",
            Category: "Smysly",
            Title: "Vládce tmy (šátek)",
            Prompt: "Láká mě zakrýt partnerovi oči šátkem a pomalu ho překvapovat doteky, chladem i šepotem.",
            SpiceLevel: 2,
            ComplementaryCardId: "blindfold_receive",
            PolarityLabel: "Smyslová polarita: Tajemství ve tmě"
        ),
        new(
            Id: "blindfold_receive",
            Category: "Smysly",
            Title: "Naslepo v tvých rukou",
            Prompt: "Chci si nechat zakrýt oči šátkem a prožít každý dotek bez toho, abych tušil/a, co přijde dál.",
            SpiceLevel: 2,
            ComplementaryCardId: "blindfold_give",
            PolarityLabel: "Smyslová polarita: Tajemství ve tmě"
        ),

        // Symmetric / Shared Desire Cards
        new(
            Id: "strangers_bar",
            Category: "Roleplay",
            Title: "Cizinci u sklenky vína",
            Prompt: "Zahrajme si, že se neznáme — jiná jména, setkání ‚náhodou‘ a svádění od první věty.",
            SpiceLevel: 2,
            ComplementaryCardId: null,
            PolarityLabel: null
        ),
        new(
            Id: "daytime_texts",
            Category: "Napětí",
            Title: "Předehra už od 15:00",
            Prompt: "Posílejme si přes den tři krátké, nečekané a lehce zakázané zprávy, než se večer potkáme.",
            SpiceLevel: 1,
            ComplementaryCardId: null,
            PolarityLabel: null
        ),
        new(
            Id: "slow_oil_massage",
            Category: "Smysly",
            Title: "Pomalý rituál bez cíle",
            Prompt: "30 minut v šeru při svíčce s teplým olejem a pravidlem: žádný spěch, jen objevování těla.",
            SpiceLevel: 1,
            ComplementaryCardId: null,
            PolarityLabel: null
        ),
        new(
            Id: "forbidden_zone",
            Category: "Napětí",
            Title: "Zakázaná zóna doteku",
            Prompt: "Prvních dvacet minut se nesmíme dotknout nejcitlivějších míst — o to pomaleji všeho kolem.",
            SpiceLevel: 2,
            ComplementaryCardId: null,
            PolarityLabel: null
        ),
        new(
            Id: "whispered_fantasy",
            Category: "Blízkost",
            Title: "Šeptání do tmy",
            Prompt: "Chci, abychom si do ucha pošeptali jednu fantazii, kterou jsme nahlas ještě nikdy neřekli.",
            SpiceLevel: 2,
            ComplementaryCardId: null,
            PolarityLabel: null
        ),
        new(
            Id: "verbal_tease",
            Category: "Napětí",
            Title: "Hra se slovy na hraně",
            Prompt: "Vzrušuje mě, když partner popisuje, co se mnou chce udělat, ještě dřív, než se mě dotkne.",
            SpiceLevel: 3,
            ComplementaryCardId: null,
            PolarityLabel: null
        ),
        new(
            Id: "ice_and_warmth",
            Category: "Smysly",
            Title: "Led a žár",
            Prompt: "Vyzkoušejme kontrast kostky ledu a teplého dechu na šíji, zádech a klíčních kostech.",
            SpiceLevel: 2,
            ComplementaryCardId: null,
            PolarityLabel: null
        ),
        new(
            Id: "mirror_gaze",
            Category: "Blízkost",
            Title: "Dvě minuty bez uhnutí pohledem",
            Prompt: "Sednout si proti sobě v přítmí, držet se za ruce a 2 minuty si mlčky hledět do očí, než začne noc.",
            SpiceLevel: 1,
            ComplementaryCardId: null,
            PolarityLabel: null
        )
    ];

    public static DesireCardDto? GetById(string id) =>
        All.FirstOrDefault(c => c.Id.Equals(id, StringComparison.OrdinalIgnoreCase));
}
