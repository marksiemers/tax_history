# Historical U.S. Income Tax Rate Changes — Context & After-Effects

Chart-ready annotations for the top and bottom **marginal** rates in the dataset (Married Filing Jointly used as the canonical schedule, per the chart). Each entry gives the rate movement (exact from the CSV), what drove it, and what happened afterward.

> **Status:** the six "headline" beats at the foot of this file (1913, 1918,
> 1925, 1944, 1964, 1988) are wired into the chart as `MILESTONES`, with the
> detail text condensed to two or three sentences each. Everything else here is
> unused reserve. If you promote another episode, keep the "coincided with"
> framing — `npm test` enforces it.

**One caution that applies to every entry below:** tax changes almost never happen in isolation. They ride alongside wars, Federal Reserve policy, and the ordinary business cycle, so the "after-effects" are *correlation, not proven causation*. Economists genuinely disagree about how much any single tax change caused the growth, recession, or market move that followed. Where the dispute is sharp, it's flagged.

---

## The Civil War tax (1862–1872): the first federal income tax

**1862** — First-ever U.S. income tax introduced. Rates **3%–5%**.
**1864** — Raised to **5%–10%** as war costs mounted (peak of the Civil War schedule).
**1867** — Cut to a flat **5%**.
**1870** — Cut to **2.5%**.
**1872** — Tax allowed to **expire** (gap in data until 1894).

- **Driver:** Emergency financing for the Union war effort under the Revenue Acts of 1861/1862; the Bureau of Internal Revenue (forerunner of the IRS) was created to collect it.
- **After-effects:** The tax was always framed as temporary and was repealed once war debt became manageable. It set the precedent that income could be taxed directly, but for the next two decades the federal government reverted to relying on tariffs and excise taxes.
- **Chart note:** Mark 1862 as "First U.S. income tax (Civil War)" and 1872 as "Tax expires."

## The 1894 tax, struck down (1894–1895)

**1894** — A flat **2%** income tax enacted (Wilson–Gorman Tariff Act).

- **Driver:** Populist pressure to shift the tax burden off tariffs (which fell hardest on ordinary consumers) and onto wealth.
- **After-effects:** Struck down almost immediately by the Supreme Court in *Pollock v. Farmers' Loan & Trust* (1895), which ruled a tax on income from property an unconstitutional "direct tax." This defeat is what made a **constitutional amendment** necessary — the direct cause of the 16th Amendment two decades later.
- **Chart note:** 1894 is an isolated point; annotate "Struck down by Supreme Court (1895)."

---

## The modern income tax is born (1913)

**1913** — Rates **1%–7%**, 7 brackets. Top rate hit only above ~$500,000 (roughly $16M today).

- **Driver:** Ratification of the **16th Amendment** (Feb. 1913), which explicitly authorized a federal income tax; enacted via the Revenue Act of 1913 (Underwood Tariff).
- **After-effects:** A true "class tax," not a "mass tax" — fewer than 1% of households owed anything. It coexisted with a strong pre-war economy. The low rates lasted only three years before WWI transformed everything.
- **Chart note:** Key origin point — "Modern income tax begins (16th Amendment)."

## World War I (1916–1921): the first great spike

**1916** — Top jumps to **15%** (Revenue Act of 1916).
**1917** — Top leaps to **67%** (War Revenue Act of 1917).
**1918** — **Wartime peak: 77% top, 6% bottom**, 56 brackets (Revenue Act of 1918).
**1919–1921** — Settles at **73%**.

- **Driver:** Financing U.S. entry into WWI (1917). Rates on the wealthy rose roughly tenfold in two years; the number of brackets exploded to finance the war.
- **After-effects:** The tax raised enormous revenue and helped fund the war without runaway debt, but the immediate **postwar period saw a sharp depression (1920–1921)** — unemployment spiked to ~12% — driven mainly by demobilization and tight money, not the tax itself. That downturn set the political stage for the tax-cutting decade that followed.
- **Chart note:** Label 1918 "WWI peak — top rate 77%." This is the first dramatic peak on the chart.

## The Mellon cuts / Roaring Twenties (1922–1931): the interwar trough

**1922** — Top cut to **58%**.
**1924** — Top cut to **46%**.
**1925** — Top slashed to **25%**, bottom to **1.5%** — held through **1931** (the low-water mark between the wars).

- **Driver:** Treasury Secretary **Andrew Mellon**'s campaign under Harding and Coolidge (Revenue Acts of 1921, 1924, 1926), arguing that excessively high rates were avoided rather than paid and that lower rates would broaden the base.
- **After-effects — genuinely disputed:**
  - *Supporters point out:* real GNP grew ~4.7%/yr from 1922–1929 and unemployment fell from ~6.7% to ~3.2%. Revenue from top earners actually rose as reported high incomes grew and tax shelters became less attractive.
  - *Critics point out:* the same decade saw surging financial speculation and rising inequality, and it ended in the **1929 crash and the Great Depression**. Some historians link the concentration of income to the crash's severity.
  - *The honest middle:* the federal government was tiny then (federal revenue <5% of GDP), so many economists doubt tax policy alone could have caused either the boom or the bust. The 1929 crash and the Depression had deeper monetary and banking roots.
- **Chart note:** Label 1925 "Mellon cuts — 25% (interwar low)." This is the first major trough; it mirrors 1988 later.

## The Depression reversal (1932): the largest peacetime hike

**1932** — Top **triples from 25% to 63%**, bottom to **4%** (Revenue Act of 1932).

- **Driver:** Not the New Deal — this was **Herbert Hoover** trying to balance the budget as the Depression collapsed federal revenue. It was the largest peacetime tax increase in U.S. history to that point.
- **After-effects — disputed:** The economy kept contracting sharply into 1932–33 (unemployment reached ~25%). Some economists (and the Britannica/Cato view) argue the hike was contractionary austerity at the worst possible moment, further discouraging spending. Others (Romer & Romer and others) find the increases had little visible adverse macro effect and that banking collapse and deflation were the real drivers. The tax likely contributed to Hoover's landslide defeat that November.
- **Chart note:** Label 1932 "Depression tax hike — 25%→63% (largest peacetime increase)." Steep upward jump.

## New Deal "soak the rich" (1936)

**1936** — Top raised to **79%** (Revenue Act of 1935).

- **Driver:** FDR's New Deal tax philosophy, targeting the very highest incomes for both revenue and redistribution/populist reasons.
- **After-effects:** Very few people paid it — no more than ~5% of the population owed any income tax through the 1930s. A minority of economists blame the mid-decade tax increases (combined with monetary tightening) for the **1937–38 recession**, but that's not the mainstream view; the Fed's reserve-requirement hikes and fiscal pullback are more commonly cited.
- **Chart note:** Optional — "New Deal top rate 79%."

## World War II (1940–1945): the tax becomes a "mass tax"

**1941** — Top **81%**, bottom jumps to **10%**.
**1942** — Top **88%**, bottom **19%** (Revenue Act of 1942 — "the greatest tax bill in American history").
**1944** — **All-time peak: 94% top, 23% bottom** (Individual Income Tax Act of 1944).

- **Driver:** Total-war financing. The 1942 act, plus payroll withholding introduced in 1943, pulled tens of millions of ordinary workers onto the tax rolls for the first time.
- **After-effects:** This is the pivotal structural change in the whole series. The bottom rate leapt from near-zero to ~20% **and never returned to the old floor** — the income tax permanently shifted from a narrow tax on the rich to a broad tax on nearly everyone. The wartime and postwar economy boomed (war spending ended the Depression), though the boom is attributed to mobilization and pent-up demand, not the tax. Note that effective rates paid were far below 94% because of deductions and shelters.
- **Chart note:** Label 1944 "**All-time peak — 94% top rate (WWII)**" and separately flag the bottom-rate line ~1942–44 as "Income tax becomes a mass tax." The single most important annotation on the chart.

## The 91% era (1946–1963): high rates in peacetime

**1946** — Eases slightly to **91% top, 20% bottom** after the war.
**1952–1953** — Nudged up to **92%** (**Korean War** financing).
**1954** — Back to **91%**, where it held through 1963.

- **Driver:** Cold War defense spending and debt service kept rates high even in peacetime; the top rate stayed above 90% for nearly two decades.
- **After-effects:** This is the era people argue about most today. The 1950s combined ~91% top rates with strong, broadly shared growth — but effective rates on top earners were far lower (often estimated in the 40s–50s%) because of abundant deductions, exclusions, and shelters. So the period is weak evidence that 91% statutory rates either powered or throttled growth.
- **Chart note:** Shade 1944–1963 as "The 90%+ era"; mark the small 1952–53 bump "Korean War (92%)."

## The Kennedy–Johnson cut (1964–1965): the first big peacetime reduction

**1964** — Top cut to **77%**, bottom to **16%**.
**1965** — Top settles at **70%**, bottom **14%** (Revenue Act of 1964).

- **Driver:** A demand-side ("Keynesian") tax cut proposed by Kennedy and signed under Johnson, argued to be stimulative because rates had drifted so high.
- **After-effects:** Followed by strong growth and falling unemployment through the mid-1960s, and it's often cited by *both* supply-siders and Keynesians as a successful stimulus. Caveat: the economy was already expanding, and rising Vietnam/Great Society spending also fueled demand, so isolating the tax cut's contribution is hard. The **70% top rate then held for 16 years** (1965–1981).
- **Chart note:** Label 1964–65 "Kennedy–Johnson cut — 91%→70%." Clear downward step.

## The Reagan revolution, part 1 (1981–1982)

**1982** — Top cut from **70% to 50%** (Economic Recovery Tax Act of 1981, phased in).

- **Driver:** Reagan's supply-side agenda — a ~23% across-the-board rate cut, the largest of its kind.
- **After-effects — heavily studied and debated:**
  - The **deep 1981–82 double-dip recession** (unemployment topped **10%** in 1982–83) is mostly attributed to the **Volcker Fed's** war on inflation (interest rates near 20%), *not* the tax cut. When the Fed eased, the economy took off, growing ~3.9%/yr from 1982–89.
  - The cuts (with big defense-spending increases) blew up the deficit and roughly tripled the national debt; Reagan signed several **partial tax increases** from 1982 onward to claw revenue back.
  - Whether the cuts "paid for themselves" is contested — most economists say no; revenue fell relative to trend, and the recovery is attributed to a mix of tax cuts, Fed easing, and the business cycle.
- **Chart note:** Label 1982 "Reagan ERTA — 70%→50%."

## The Reagan revolution, part 2 (1987–1988): the modern trough

**1987** — Transition year: top **38.5%**, brackets collapse to 5.
**1988** — Top **28%**, bottom **15%**, only **2 brackets** (Tax Reform Act of 1986).

- **Driver:** The **bipartisan** 1986 reform — a "broaden the base, lower the rates" deal that swept away dozens of deductions and shelters in exchange for far lower statutory rates. Top rate hit its lowest level since before the Depression.
- **After-effects:** The "top" rate now reached deep into the upper-middle class (a couple crossed into 28% at ~$84,000 in today's dollars). Reported income of high earners jumped as shelters disappeared, boosting their share of taxes paid. The late-1980s expansion continued, though the 1986 act is generally judged more as a structural clean-up than a growth lever, and it was followed by the 1990–91 recession.
- **Chart note:** Label 1988 "Tax Reform Act of 1986 — 28% (modern low, 2 brackets)." The mirror image of 1925; the chart's lowest top-rate point after 1931.

## Deficit-driven increases (1991, 1993)

**1991** — Top up to **31%** (Bush "read my lips" budget deal, 1990).
**1993** — Top up to **39.6%**, adds brackets (Clinton, Omnibus Budget Reconciliation Act).

- **Driver:** Both were **deficit-reduction** packages, not economic stimulus. Bush's broke his no-new-taxes pledge; Clinton's passed with zero Republican votes.
- **After-effects — the marquee modern dispute:** The 1993 hike was followed by the long **1990s boom** (23M jobs, deficit → surplus by 1998). Whether the tax increase *helped* (by cutting deficits and interest rates) or the boom happened *despite* it is fiercely contested:
  - *One camp:* deficit reduction lowered long rates and the tax hike shifted the budget toward surplus — pro-growth.
  - *Other camp:* the strongest growth came in Clinton's **second** term after the **1997 capital-gains tax cut** and the tech boom; the 1993 hike also preceded the Democrats' historic 1994 midterm losses.
  - *Honest read:* the 1990s boom had many fathers — the Fed, the dot-com investment surge, the end of the Cold War "peace dividend" — so it's weak proof either way.
- **Chart note:** Label 1993 "Clinton increase — 31%→39.6%." Modest upward step.

## The Bush cuts (2001–2003)

**2001** — Top eased to **39.1%** (EGTRRA).
**2002** — New **10%** bottom bracket added (bottom falls from 15% to 10%).
**2003** — Top cut to **35%** (JGTRRA), where it held through 2012.

- **Driver:** Campaign-promise tax relief atop a projected budget surplus; the 2003 act accelerated the cuts to counter the post-dot-com, post-9/11 slowdown.
- **After-effects:** A modest early-2000s recovery followed, but the surplus swung back to deficits, and the expansion ended in the **2008 financial crisis** (unrelated to the tax cuts in cause). The cuts were set to expire in 2010 and became a recurring political fight ("the fiscal cliff").
- **Chart note:** Label 2002–03 "Bush cuts — 35% top, new 10% bottom bracket."

## The fiscal-cliff deal (2013)

**2013** — Top restored to **39.6%**, 7th bracket added (American Taxpayer Relief Act).

- **Driver:** The 2012 "fiscal cliff" compromise let the top-end Bush cuts expire while making the rest permanent — a targeted increase on the highest incomes.
- **After-effects:** Occurred mid-recovery from the Great Recession; growth and the bull market continued through the 2010s. No recession followed, which is often cited against predictions that the increase would derail the recovery — though, as always, monetary policy (near-zero rates, QE) was doing the heavy lifting.
- **Chart note:** Label 2013 "Top rate back to 39.6% (fiscal-cliff deal)."

## The Tax Cuts and Jobs Act (2018–present)

**2018** — Top cut to **37%**, bottom stays **10%**, 7 brackets (Tax Cuts and Jobs Act of 2017).

- **Driver:** The most recent rate change — a broad cut best known for slashing the **corporate** rate (35%→21%); the individual top rate came down modestly to 37%.
- **After-effects:** Growth and low unemployment continued into 2019 before the **COVID-19 shock** in 2020 scrambled any clean read of the law's effects. Deficits widened. The individual provisions are scheduled to sunset after 2025, making the current schedule temporary.
- **Chart note:** Label 2018 "Tax Cuts and Jobs Act — 37% (current top rate)." Note the individual rates expire after 2025.

---

## Suggested "headline" annotations for a clean chart

If the chart gets cluttered, these six carry the whole story:

1. **1913** — Modern income tax begins (16th Amendment)
2. **1918** — WWI peak, 77%
3. **1925** — Mellon cuts, 25% (interwar low)
4. **1944** — All-time peak, 94% + income tax becomes a "mass tax"
5. **1964–65** — Kennedy–Johnson cut, 91%→70%
6. **1988** — Reagan/TRA-86 low, 28% (2 brackets)

## Two "structural" annotations (about the shape, not a single year)

- **The bottom-rate step of the 1940s:** the single most consequential change — the income tax stopped being a tax on the rich and became a tax on nearly everyone, and never went back.
- **The bracket-count collapse:** from 50+ brackets in 1918 down to **2** in 1988, then back up to 7 today — a separate line worth plotting on its own axis.

---

*Sources for the after-effects span the political spectrum deliberately (Brookings, AEI, Cato, Heritage, Britannica, academic tax-history work) because most of these episodes are contested. Treat every causal claim as "coincided with," not "caused."*
