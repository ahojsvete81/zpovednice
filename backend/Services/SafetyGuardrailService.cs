using System.Text.RegularExpressions;
using Zpovednice.Api.Models;

namespace Zpovednice.Api.Services;

public record SafetyCheckResult(bool IsBlocked, CrisisHelpDto? CrisisHelp);

public class SafetyGuardrailService
{
    private static readonly Regex SelfHarmPattern = new(
        @"\b(sebevražd\w*|zabít se|zabiju se|chci umřít|nechci žít|podřezat|ublížit si|sebepoškoz\w*|suicide|kill myself)\b",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly Regex SevereAbusePattern = new(
        @"\b(dítě|děti|dětmi|nezletil\w*|pedofil\w*|znásiln\w*|bez souhlasu|donutil jsem ji|donutila jsem ho|násilí na|underage|child abuse|rape)\b",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    public SafetyCheckResult Evaluate(string? input)
    {
        if (string.IsNullOrWhiteSpace(input))
            return new SafetyCheckResult(false, null);

        if (SelfHarmPattern.IsMatch(input))
        {
            return new SafetyCheckResult(
                true,
                new CrisisHelpDto(
                    "Vypadá to, že procházíš velmi těžkým obdobím. Zpovědnice je jen hravá aplikace a nemůže nahradit lidskou podporu — nejsi v tom ale sám/sama. Prosím, ozvi se odborníkům, kteří tu jsou anonymně a nonstop.",
                    [
                        new HelplineDto("Linka první psychické pomoci", "116 123", "Zdarma, anonymně, nonstop (24/7)"),
                        new HelplineDto("Linka bezpečí (do 26 let)", "116 111", "Zdarma, anonymně, nonstop"),
                        new HelplineDto("Záchranná služba", "155 / 112", "V akutním ohrožení života")
                    ]
                )
            );
        }

        if (SevereAbusePattern.IsMatch(input))
        {
            return new SafetyCheckResult(
                true,
                new CrisisHelpDto(
                    "Tato zpovědnice je určena výhradně pro dospělé (18+) a dobrovolná, bezpečná témata. Obsah týkající se nezletilých, násilí nebo jednání bez souhlasu nemůžeme zpracovat. Pokud jsi obětí násilí nebo potřebuješ pomoc, obrať se na specializované linky.",
                    [
                        new HelplineDto("Bílý kruh bezpečí", "116 006", "Pomoc obětem kriminality a domácího násilí (nonstop, zdarma)"),
                        new HelplineDto("Linka první psychické pomoci", "116 123", "Anonymní podpora 24/7"),
                        new HelplineDto("Policie ČR", "158", "Akutní pomoc")
                    ]
                )
            );
        }

        return new SafetyCheckResult(false, null);
    }
}
