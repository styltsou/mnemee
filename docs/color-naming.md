# Color naming

Automatic solid-color titles are resolved locally in
`apps/server/src/lib/color-names.ts`, in this order:

1. An exact [CSS named color](https://www.w3.org/TR/css-color-4/#named-colors).
   Labels use readable capitalization and spaces. Synonyms resolve consistently
   to Gray (rather than Grey), Cyan (rather than Aqua), and Magenta (rather than
   Fuchsia). CSS meanings take precedence, including Green `#008000` and Lime
   `#00ff00`.
2. An exact entry in the full MIT-licensed
   [Color Names dictionary](https://github.com/meodai/color-names), provided by
   the pinned `color-name-list` dependency (32,004 names in version 14.86.0).
3. The closest entry in that same full dictionary by Euclidean OKLab distance.
   Dictionary coordinates are computed once, lazily, and reused; each lookup
   scans them without sorting. Ties use dictionary order. If the selected RGB
   value has a CSS name, that standard label takes precedence here too.

The full dictionary was chosen over its 5,000-name best-of subset to improve
coverage and reduce repeated titles. It includes evocative community names;
it is not an industry naming standard. Multiple input colors can still resolve
to the same name. The previous implementation used roughly 1,500 NTC names
with Delta-E matching. OKLab keeps matching perceptual while allowing fast
searches across the larger dictionary; it is also used by color image search
and gradient comparison elsewhere in Mnemee.

Inputs accept three-, four-, six-, or eight-digit hex, regardless of case.
Alpha is ignored for naming: the title describes the RGB value, not its
appearance composited over a background. Invalid hex returns `null`.

The same resolver supplies the stop-color descriptions used by gradient naming.
Gradient title generation and manual-title preservation follow the existing
naming policy. Saved titles are not migrated: new automatic names take effect
when creation, editing, or clearing a manual title invokes the resolver.
The existing name/hex display is unchanged.

Keep dictionary upgrades explicit: changing its version or matching algorithm
can change generated titles. No external naming API is required at runtime.
