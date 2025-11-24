// Ultimate Striker Run – Kit Customizer (Web Component, buildless)
// Drop-in usage:
//   <script type="module" src="./usr-kit-customizer.js"></script>
//   <usr-kit-customizer></usr-kit-customizer>

const BRAND = {
  // Brand palette for quick presets
  navy: "#050816",
  orange: "#FF7A3C",
  pink: "#FF2FBF",
  cyan: "#33F2D8",
  lime: "#E9FF4F"
};


const PLAYER_IMG_DATA = "data:image/png;base64," +
  "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" +
  "3ElR6fzf+bOQP2fVzgBeuCgqnf+7eBUK5/8u3YT8ubB2BvDy06LS+b8rz0Ph/N/Vl6HS+b+t16Fw/m/7bcifn2tnAHfeF5XO/+1+DIXzf3vfhvx5v3YGcP+7" +
  "otu178Of9Wf17wpnA8tjKJ0P7B6/Pjd97uFsYHnNSucDy2sezgaWa1U6H9hdZ10DukbC2cCytkrnA7t1qWtW13TpfGC3H3Sv6F4KZwPLHiydD+z2r+5t3fvh" +
  "bGCZGaXzgd280Vmks6p0PrCbczoDdUaGs4FltpbOB3ZzuWoj7jMABmAABmAABmAABmAABmAABmAABuBmBMAADMAADMAADMAADMAADMAADMAA3IwAGIABGIAB" +
  "GIABGIABGIABGIABGICbEQADMAADMAADMAADMAADMAADMAADcDP66l++GfxHg/pVuuvKqK8frYa+SXdscT163C56nO704nrypBuaSHeJGTU50Q9NpTvMuKYn" +
  "10Mz6e40o2anNkNz6c42rvnp7aKFdEcc1+LMbmgp3U1n1PLsfmgl3YnHtTp3WNRKd/BxteePQ510959R3YXTUC/dOcjVXzwPraW7Do1aX7oMbaQ7Frk2l6+L" +
  "ttKdjlzbK7ehnXSXpFG7q89Ce+kOS6791ouig3RnJtdh+1XoKN3ZyXXceVN0ku4I5TrtvgudpbtJjTrvfQhdpDtRuS77n4qu0h2sXNdrn0M36e5Xo27Xvw9/" +
  "1p/Vv8v/O/oY9DH6x6/PTZ+7f130NdPXVF9zfz30Wum19NdZ14CuEb9+dG3p2vPrUtesrmld834/6F7RveT3me5B3aN+/+re1r3v54LODJ0pft7oLNJZpbPM" +
  "zzmdgToj/fzU2aqz18/lqo24zwAYgAEYgAEYgAEYgAEYgAEYgAEYgJsRAAMwAAMwAAMwAAMwAAMwAAMwAANwMwJgAAZgAAZgAAZgAAZgAAZgAAZgAG5GAAzA" +
  "AAzAAAzAAAzAAAzAAAzAAAzAzQiAARiAARiAARiAARiAARiAARiAAbgZATAAAzAAAzAAAzAAAzAAAzAAAzAANyMABmAABmAABmAABmAABmAABmAABuBmBMAA" +
  "DMAADMAADMAADMAADMAADMAA3IwAGIABGIABGIABGIABGIABGIABGICbEQADMAADMAADMAADMAADMAADMAADcDMCYAAGYAAGYAAG4GoATk+4Of3qm9Wir20h" +
  "5L551A49skU07PHjbuiJLcDcxJN+0aQt3NzUxHpo2hZ+bmZys2jWNkxubmo7NG+bbdjC9G5o0TZqbmlmv2jZNnhuZfYwtGrDYVhr7jjUtsGS68yfFnVtIOV6" +
  "C+ehvg203NriZdG6DcLcxtJ1aNOG6LCt5dvQtg3g3M7Ks6JdG9y5vdUXoX0b+sMOWq9ChwZG7qj9JnRs2Aw76bwLnRpUubPuh6JzAy530fsUujQch131P4eu" +
  "Ddbczdr3RbfrP4Q/68/q3+X/HX0M+hj949fnps/dvy76mulrqq+5vx56rfRa+uusa0DXiF8/urZ07fl1qWtW17Sueb8fdK/oXvL7TPeg7lG/f3Vv6973c0Fn" +
  "hs4UP290Fums0lnm55zOQJ2Rfn7qbNXZ6+dy1UbcZwAMwAAMwAAMwABcBcD+f/2b0NcJ3lGlt5wTuq7wlnNC1+XfirG3nRO8o0pvOSd0Xf4tIHvbOcE7qvSW" +
  "c0LXFd5yTui6/FtW9rZzgndU6S3nhK4rvOWc0HX5t9jsbecE76jSW84JXZd/a8/edk7wjiq95ZzQdYW3nBO6Lv9WpL3tnOAdVXrLOaHrCm85J3RdpbecE7qu" +
  "8JZzQtfl37K1t50TvKNKbzkndF3hLeeErsu/xWxvOyd4Rz0dAOz/rD+rf1d4O1oeQ+ktaff49bnpcw9vR8trVnpLWl7z8Ha0XKvSW9LuOusa0DUS3o6WtVV6" +
  "S9qtS12zuqZLb0m7/aB7RfdSeDta9mDpLWm3f3Vv694Pb0fLzCi9Je3mjc4inVWlt6TdnNMZqDMyvB0ts7X0lrSby1UbcZ8BMAADMAADMAADMAADMAADMAAD" +
  "MAA3IwAGYAAGYAAGYAAGYAAGYAAGYAAG4GYEwAAMwAAMwAAMwAAMwAAMwAAMwADcjAAYgAEYgAEYgAEYgAEYgAEYgAEYgJsRAAMwAAMwAAMwAAMwAAMwAAMw" +
  "AANwMwJgAAZgAAZgAAZgAAZgAAZgAAZgAG5GAAzAAAzAAAzAAAzAAAzAAAzAAAzAzQiAARiAARiAARiAARiAARiAARiAAbgZATAAAzAAAzAAAzAAAzAAAzAA" +
  "AzAANyMABmAABmAABmAABmAABmAABmAABuBmBMAADMAADMAADMAADMAADMAADMAA3IwAGIABGIABGIABGIABGIABGIABGICbEQADMAADMAADMAADMAADMAAD" +
  "MAADcDMCYAAGYAAGYAAGYAAGYAAGYAAGYABuRgAMwAAMwAAMwABcDcDpCTenr79pFX1jCyH36FEn9NgW0bAnj3uhCVuAuckna0VTtnBz0xMboRlb+LnZya2i" +
  "OdswufmpndCCbbZhi9N7oSXbqLnlmYOiFdvgudXZo1DLhsOw9txJqGODJdedPyvq2UDK9RcuQms20HLri1dFGzYIc5tLN6EtG6LDtpefhnZsAOd2V54X7dng" +
  "zu2vvgwd2NAfdth6HToyMHLH7behE8Nm2GnnfejMoMqddz8WXRhwucvet6Erw3HYdf+70I3Bmrtd+6Ho6fqP4c/6s/p3+X9HH4M+Rv/49bnpc/evi75m+prq" +
  "a+6vh14rvZb+Ousa0DXi14+uLV17fl3qmtU1rWve7wfdK7qX/D7TPah71O9f3du69/1c0JmhM8XPG51FOqt0lvk5pzNQZ6Sfnzpbdfb6uVy1EfcZAAMwAAMw" +
  "AAMwAAMwAAMwAAMwAANwMwJgAAZgAAZgAAZgAAZgAAZgAAZgAG5GAAzAAAzAAAzAAAzAAAzAAAzAAAzAzQiAARiAARiAARiAARiAARiAARiAAbgZATAAAzAA" +
  "AzAAAzAAAzAAAzAAAzAANyMABmAABmAABmAABmAABmAABmAABuBmBMAADMAADMAADMAADMAADMAADMAA3IwAGIABGIABGIABGIABGIABGIABGICbEQADMAAD" +
  "MAADMABXAfDXjwYoNahvHrWKHj1uhx4/7oSePOkWTTzphSYn+qGpibWi6cn10MzkRmh2ajM0N7VVND+9HVqY3gktzuwWLc3shZZn90MrswdFq3OHodbcUag9" +
  "f1zUmT8JdRdOQ72Fs6L+4nlobfEitL50GdpYuiraXL4ObS3fhLZXbot2Vp6GdlefhfZWnxftt16EDlovQ4ftV0VH7deh486b0Ennbei0+67orPs+dN77ELro" +
  "fSy67H8KXfW/DV2vfS66WfsudLv+fejp+g9FzzZ+DH/Wn9W/y/87+hj0MfrHr89Nn7t/XfQ109dUX3N/PfRa6bX011nXgK4Rv350bena8+tS16yuaV3zfj/o" +
  "XtG95PeZ7kHdo37/6t7Wve/ngs4MnSl+3ugs0lmls8zPOZ2BOiP9/NTZqrPXz+WqjbjPABiAARiAARiAARiAARiAARiAARiAmxEAAzAAAzAAAzAAAzAAAzAA" +
  "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" +
  "AAMwAI9FAAzAAAzAAAzAAAzAAAzAAFzHABiAARiAARiAARiAARiAxyIABmAABmAABmAABmAABmAArmMADMAADMAADMAADMAADMBjEQADMAADMAADMABXA3C+" +
  "B2cTevy4V1S69/OTtVC49/PERsjfE9Xu/zy5VVS69/PUTsjfi9Xu/zy9V1S69/PMQSjc+3n2KOTvHWv3f547KSrd+3n+LNT1935euAj5e93a/Z8Xr4pK935e" +
  "ugn5e+za/Z+XnxaV7v288jwU7v28+jLk7wls939uvS4q3fu5/TYU7v3ceR8q3fu5+zEU7v3c+zZ02f8cqhrNLwuwPDd57uG+0PKale4NLa95uC+0XKvSvaHd" +
  "ddY1oGsk3Bda1lbp3tBuXeqa1TVduje02w+6V3Qv+X2me7B0b2i3f3Vv694P94WWmVG6N7SbNzqLdFaV7g3t5pzOQJ2R4b7QMltL94Z2c7lqI+4zAAZgAAZg" +
  "AAZgAAZgAAZgAK5jAAzAAAzAAAzAAAzAAAzAYxEAAzAAAzAAAzAAAzAAAzAA1zEABmAABmAABmAABmAABuCxCIABGIABGIABGIABGIABGIDrGAADMAADMAAD" +
  "MAADMAAD8FgEwAAMwAAMwAAMwAAMwAAMwHUMgAEYgAEYgAEYgAEYgAF4LAJgAAZgAAZgAAZgAAZgAAbgOgbAAAzAAAzAAAzAAAzAADwWATAAAzAAAzAAAzAA" +
  "AzAAA3AdA2AABmAABmAABmAABmAAHosAGIABGIABGIABGIABGIABuI4BMAADMAADMAADMAADMACPRQAMwAAMwAAMwAAMwAAMwABcxwAYgAEYgAEYgAEYgAEY" +
  "gMciAAZgAAZgAAZgAAZgAAZgAK5jAAzAAAzAAAzAAAzAAAzAYxEAAzAAAzAAAzAAAzAAAzAA1zEABmAABmAABmAABmAABuCxaABwesLN6fHjftETWwi5iSfr" +
  "oUlbRMOmJjZD07YAczOT20WztnBzc1O7oXlb+LmF6f2iRdswuaWZw9CybbZhK7PHoVXbqLnW3GlR2zZ4rjN/HuracBjWW7gM9W2w5NYWr4vWbSDlNpZuQ5s2" +
  "0HJby8+Ktm0Q5nZWXoR2bYgO21t9Fdq3AZw7aL0pOrTBnTtqvwsd29AfdtL5EDo1MHJn3U+hc8Nm2EXvc+iy/12oajS/LMDy3OS5+9dFXzN9TfU199dDr5Ve" +
  "S3+ddQ3oGvHrR9eWrj2/LnXN6prWNe/3g+4V3Ut+n+ke1D3q96/ubd37fi7ozNCZ4ueNziKdVTrL/JzTGagz0s9Pna06e/1crtqI+wyAARiAARiAARiAARiA" +
  "ARiA6xgAAzAAAzAAAzAAAzAAA/BYBMAADMAADMAADMAADMAADMB1DIABGIB/AYAfPxmg1KDC144m1kL+Y/P21aPJjaLS146mtkLha0fTO6HS145m9kLha0ez" +
  "ByH/9QL76tHcUVHpa0fzJ6HwtaOFs1DXfR0i1Vu8KCp97WjpKhS+drR8Eyp97WjlaSh87Wj1ech/bcS+etR6WVT62lH7dSh87ajzNuS/5mJfPeq+Lyp97aj3" +
  "MeS/XmNfPep/W6Rfzbla+y5UNZpfMn1upa8luddFXzN9TUtfS3LXQ6+VXsvwlSRZA6WvJbn1o2tL1174SpKs2dLXkmTNh68kyV4pfS3J7TPdg7pHw1eSZG+X" +
  "vpbk5oLODJ0p4StJMotKX0uSWRa+kiQzsPS1JDc/dbbq7A1fSaqBE/cVAAMwAAMwAAMwAAMwAAMwANcxAAZgAAZgAAZgAAZgAAbgsQiAARiAARiAARiAARiA" +
  "ARiA6xgAAzAAAzAAAzAAAzAAA/BYBMAADMAADMAADMAADMAADMB1DIABGIABGIABGIABGIABeCwCYAAGYAAGYAAGYAAGYAAG4DoGwAAMwAAMwAAMwAAMwAA8" +
  "FgEwAAMwAAMwAAMwAAMwAANwHQNgAAZgAAZgAAZgAAZgAB6LABiAARiAARiAARiAARiAAbiOATAAAzAAAzAAAzAAAzAAj0UADMAADMAADMAADMAADMAAXMcA" +
  "GIABGIABGIABGIABGIDHIgAGYAAGYAAGYAAGYAAGYACuYwAMwAAMwAAMwAAMwAAMwGPRAOD0hJvTkydrRRO2EHKTExuhKVtEw6Ynt0IztgBzs1M7RXO2cHPz" +
  "03uhBVv4ucWZg6Il2zC55dmj0IpttmGrcyehlm3UXHv+rKhjGzzXXbgI9Ww4DOsvXoXWbLDk1pduijZsIOU2l5+Gtmyg5bZXnhft2CDM7a6+DO3ZEB2233od" +
  "OrABnDtsvy06ssGdO+68D53Y0B922v0YOjMwcue9b0MXhs2wy/53oau170NVo/llAY7PTZ+7f130NdPXVF9zfz30Wum19NdZ14CuEb9+dG3p2vPrUtesrmld" +
  "834/6F7RveT3me5B3aN+/+re1r3v54LODJ0pft7oLNJZpbPMzzmdgToj/fzU2aqz18/lqo24zwAYgAEYgAEYgAEYgAEYgAG4jgEwAAMwAAMwAAMwAAMwAI9F" +
  "AAzAAAzAAAzAAAzAAAzAAFzHABiAARiAARiAARiAARiAxyIABmAABmAABmAABmAABmAArmMADMAADMAADMAADMAADMBjEQADMAADMAADMAADMAADMADXMQAG" +
  "YAAGYAAGYAAGYAAG4LEIgAEYgAEYgAEYgAEYgAEYgOsYAAMwAAMwAAMwAAMwAAPwWATAAAzAAAzAAAzAAAzAAAzAdQyAARiAARiAARiAARiAAXgsAmAABmAA" +
  "BmAABmAABmAABuA6BsAADMAADMAADMAADMAAPBYBMAADMAADMAADcBUAPzGUmtNEgnfUpKGbm0rouqYN3mEzCV3XrKGbm0vwjpo3dHMLCV3XoqGbW0rwjlo2" +
  "dHMrCV3XqsE7rJXQdbUN3VwnwTuqa+jmegldV9/gHbaW0HWtG7q5jQTvqE1DN7eV0HVtG7q5nQTvqF1DN7eX0HXtG7zDDhK6rkNDN3eU4B11bOjmThK6rlOD" +
  "d9hZQtd1bujmLhK6rkuDd9hVQtd1PYDJVzWaXzJ9bvrc/euir5m+pvqa++uh10qvpb/OugZ0jfj1o2tL155fl7pmdU3rmvf7QfeK7iW/z3QP6h71+1f3tu59" +
  "Pxd0ZuhM8fNGZ5HOKp1lfs7pDNQZ6eenzladvX4uV23EfQbAAAzAAAzAAAzAAAzAAAzAdQyAARiAARiAARiAARiAAXgsAmAABmAABmAABmAABmAABuA6BsAA" +
  "DMAADMAADMAADMAAPBYBMAADMAADMAADcDUA5y9AN6GJJ+tFpRtvTGyGwo03JrdD/gvpdvONqd2i0o03pvdD/ovwdvONmcOi0o03Zo9D4cYbc6ch/8V9u/nG" +
  "/HlR6cYbC5ehcOONxeuQv9GA3Xxj6baodOON5Wchf4MDu/nGyoui0o03Vl+Fwo03Wm9C/oYMdvON9rui0o03Oh9C4cYb3U+h0o03ep9D4cYb/e9D12s/hKpG" +
  "88sCHJ+bPvdwUw55zUo35pDXPNyUQ65V6cYc7jrrGtA1Em7KIWurdGMOty51zeqaLt2Yw+0H3Su6l8JNOWQPlm7M4fav7m3d++GmHDIzSjfmcPNGZ5HOqtKN" +
  "Odyc0xmoMzLclENma+nGHG4uV23EfQbAAAzAAAzAAAzAAAzAAAzAdQyAARiAARiAARiAARiAAXgsAmAABmAABmAABmAABmAABuA6BsAADMAADMAADMAADMAA" +
  "PBYBMAADMAADMAADMAADMAADcB0DYAAGYAAGYAAGYAAGYAAeiwAYgAEYgAEYgAEYgAEYgAG4jgEwAAMwAAMwAAMwAAMwAI9FAAzAAAzAAAzAAAzAAAzAAFzH" +
  "ABiAARiAARiAARiAARiAx6KvnkwM/qNBTaTDn0dNTm6EptLB0a7pqa2imXTgtGt2eic0lw6rHjU/sxdaSAdduxZnD0JL6ZDsUctzR6GVdMC2a3X+pKiVDuZ2" +
  "tRfOQp10qPeo7uJFqJcOBHf1l66K1tJB4q715ZvQRjqEfNTmytPQVjrA3LW9+jy0kw4/H7XbehnaSwenu/bbr4sO0oHrrsPO29BROqx91HH3fegkHfTuOu19" +
  "LDpLB8S7zvvfhi7SAfOuy7Xviq7SwfSu6/UfQlWj+UUBluemz92/Lvqa6Wuqr7m/Hnqt9Fr666xrQNeIXz+6tnTt+XWpa1bXtK55vx90r+he8vtM96DuUb9/" +
  "dW/r3vdzQWeGzhQ/b3QW6azSWebnnM5AnZF+fups1dnr53LVRtxnAAzAAAzAAAzAAAzAAAzAAFzHABiAARiAARiAARiAARiAxyIABmAABmAABmAABmAABmAA" +
  "rmMADMAADMAADMAADMAADMBjEQADMAADMAADMAADMAADMADXMQAGYAAGYAAGYAAGYAAG4LEIgAEYgAEYgAEYgAEYgAEYgOsYAAMwAAMwAAMwAAMwAAPwWATA" +
  "AAzAAAzAAAzAAAzAAAzAdQyAARiAARiAARiAARiAAXgsGgCcnnBzmkiHP4+atIWQm0oHR7umbRENm0kHTrtmbQHm5tJh1aPmbeHmFtJB165FW/i5pXRI9qhl" +
  "2zC5lXTAtmvVNtuwVjqY29W2jZrrpEO9R3Vtg+d66UBwV9+Gw7C1dJC4a90GS24jHUI+atMGUm4rHWDu2raBlttJh5+P2rVBmNtLB6e79m2IDjtIB667Dm0A" +
  "547SYe2jjm1w507SQe+uUxv6w87SAfGucwMjd5EOmHddGjbDrtLB9K7r9R9DVaP5ZQGOz02fu39d9DXT11Rfc3899FrptfTXWdeArhG/fnRt6drz61LXrK5p" +
  "XfN+P+he0b3k95nuQd2jfv/q3ta97+eCzgydKX7e6CzSWaWzzM85nYE6I/381Nmqs9fP5aqNuM8AGIABGIABGIABGIABGIABuI4BMAADMAADMAADMAADMACP" +
  "RQAMwAAMwAAMwAAMwAAMwABcxwAYgAEYgAEYgAEYgAEYgMciAAZgAAZgAAZgAK4CYP8F6CY0meAdVbrxRkLXFW68kdB1+S+k2803EryjSjfeSOi6/Bfh7eYb" +
  "Cd5RpRtvJHRd4cYbCV2X/+K+3XwjwTuqdOONhK4r3HgjoevyNxqwm28keEeVbryR0HX5GxzYzTcSvKNKN95I6LrCjTcSui5/Qwa7+UaCd1TpxhsJXVe48UZC" +
  "11W68UZC1xVuvJHQdd0MYPJVjeaXTJ+bPvdwUw55zUo35pDXPNyUQ65V6cYc7jrrGtA1Em7KIWurdGMOty51zeqaLt2Yw+0H3Su6l8JNOWQPlm7M4fav7m3d" +
  "++GmHDIzSjfmcPNGZ5HOqtKNOdyc0xmoMzLclENma+nGHG4uV23EfQbAAAzAAAzAAAzAAAzAAAzAdQyAARiAARiAARiAARiAAXgsAmAABmAABmAABmAABmAA" +
  "BuA6BsAADMAADMAADMAADMAAPBYBMAADMAADMAADMAADMAADcB0DYAAGYAAGYAAGYAAGYAAeiwAYgAEYgAEYgAEYgAEYgAG4jgEwAAMwAAMwAAMwAAMwAI9F" +
  "AAzAAAzAAAzAAAzAAAzAAFzHABiAARiAARiAARiAARiAxyIABmAABmAABmAABmAABmAArmMADMAADMAADMAADMAADMBjEQADMAADMAADMAADMAADMADXMQAG" +
  "YAAGYAAGYAAGYAAG4LEIgAEYgAEYgAEYgKsBOD3h5jQ5sVk0ZQshNz25HZqxRTRsdmo3NGcLMDc/vV+0YAs3tzhzGFqyhZ9bnj0uWrENk1udOw21bLMNa8+f" +
  "hzq2UXPdhcuinm3wXH/xOrRmw2HY+tJtaMMGS25z+VnRlg2k3PbKi9CODbTc7uqroj0bhLn91pvQgQ3RYYftd6EjG8C5486HohMb3LnT7qfQmQ39Yee9z6EL" +
  "AyN32f8+dGXYDLte+zF0s/5TqGo0vyzA8bnpc/evi75m+prqa+6vh14rvZb+Ousa0DXi14+uLV17fl3qmtU1rWve7wfdK7qX/D7TPah71O9f3du69/1c0Jmh" +
  "M8XPG51FOqt0lvk5pzNQZ6Sfnzpbdfb6uVy1EfcZAAMwAAMwAAMwAAMwAAMwANcxAAZgAAZgAAZgAAZgAAbgsQiAARiAARiAARiAARiAARiA6xgAAzAAAzAA" +
  "AzAAAzAAA/BYBMAADMAADMAADMAADMAADMB1DIABGIABGIABGIABGIABeCwCYAAGYAAGYAAGYAAGYAAG4DoGwAAMwAAMwAAMwAAMwAA8FgEwAAMwAAMwAAMw" +
  "AAMwAANwHQNgAAZgAAZgAAZgAAZgAB6LABiAARiAARiAARiAARiAAbiOATAAAzAAAzAAAzAAAzAAj0UADMAADMAADMAADMAADMAAXMcAGIABGIABGIABGIAB" +
  "GIDHIgAGYAAGYAAGYAAGYAAGYACuYwAMwAAMwAAMwAAMwAAMwGPRV5OTA5Qa1NTkZtH01FZoZmo7NDu9UzQ3vRuan9kLLczsFy3OHoSWZg9Dy3NHoZW546LV" +
  "+ZNQa/401F44K+osnIe6ixeh3uJlUX/pKrS2dB1aX74p2li+DW2uPA1trTwr2l59HtpZfRHabb0M7bVeFe23X4cO2m9Ch523RUedd6Hj7vvQSfdD0WnvY+is" +
  "9yl03v+26KL/OXS59l3oau370PX6D0U36z+Gbjd+ClWN5pdMn5s+d/+66Gumr6m+5v566LXSa+mvs64BXSN+/eja0rXn16WuWV3Tuub9ftC9onvJ7zPdg7pH" +
  "/f7Vva17388FnRk6U/y80Vmks0pnmZ9zOgN1Rvr5qbNVZ6+fy1UbcZ8BMAADMAADMAADMAADMAADcB0DYAAGYAAGYAAGYAAGYAAeiwAYgAEYgAEYgAEYgAEY" +
  "gAG4jgEwAAPwLwJwesLNKXztyBZCzn9s3r56ZItoWOlrR7YAc+FrR7Zwc6WvHdnCz4WvHdmGyfmvF9hXj2yzDSt97cg2ai587cg2eM5/HcK+emTDYVjpa0c2" +
  "WHLha0c2kHKlrx3ZQMuFrx3ZIMz5r43YV49siA4rfe3IBnAufO3IBnfOf83FvnpkQ39Y6WtHBkbOf73Gvnpk2AzTr+bcbvw6VDWaXxbg+NxKX0tyr4u+Zvqa" +
  "lr6W5K6HXiu9luErSbIGSl9LcutH15auvfCVJFmzpa8lyZoPX0mSvVL6WpLbZ7oHdY+GryTJ3i59LcnNBZ0ZOlPCV5JkFpW+liSzLHwlSWZg6WtJbn7qbNXZ" +
  "G76SVAMn7isABmAABmAABmAABmAABmAArmMADMAADMAADMAADMAADMBjEQADMAADMAADMAADMAADMADXMQAGYAAGYAAGYAAGYAAG4LEIgAEYgAEYgAEYgAEY" +
  "gAEYgOsYAAMwAAMwAAMwAAMwAAPwWATAAAzAAAzAAAzAAAzAAAzAdQyAARiAARiAARiAARiAAXgsAmAABmAABmAABmAABmAABuA6BsAADMAADMAADMAADMAA" +
  "PBYBMAADMAADMAADMAADMAADcB0DYAAGYAAGYAAGYAAGYAAeiwAYgAEYgAEYgAEYgAEYgAG4jgEwAAMwAAMwAAMwAAMwAI9FAAzAAAzAAAzAAAzAAAzAAFzH" +
  "ABiAARiAARiAARiAARiAxyIABmAABmAABmAABmAABmAArmMADMAADMAADMAADMAADMBjEQADMAADMAADMAADMAADMADXMQAGYAAGYAAG4AcD8NON3xQ92/xt" +
  "6Pnm70Ivtn5f9HLrD6FX238Mvd7+U9GbnT+HP+vP6t/l/x19DPoY/eMHYAAG4F8E4PSEm9PU5HbRtC2E3MzUbmjWFtGwuen90LwtwNzCzGHRoi3c3NLscWjZ" +
  "Fn5uZe60aNU2TK41fx5q22Yb1lm4DHVto+Z6i9dFfdvgubWl29C6DYdhG8vPQps2WHJbKy+Ktm0g5XZWX4V2baDl9lpvivZtEOYO2u9ChzZEhx11PoSObQDn" +
  "Trqfik5tcOfOep9D5zb0h130vw9dGhi5q7UfQ9eGzbCb9V+Hbg2q3NON3xY9M+Byzzd/H3phOA57ufXH0CuDNfd6+89Fb3b+Ev6sP6t/l/939DHoY/SPX5+b" +
  "Pnf/uuhrpq+pvub+eui10mvpr7OuAV0jfv3o2tK159elrlld07rm/X7QvaJ7ye8z3YO6R/3+1b2te9/PBZ0ZOlP8vNFZpLNKZ5mfczoDdUb6+amzVWevn8tV" +
  "G3GfATAAAzAAAzAAAzAAAzAAAzAAAzAANyMABmAABmAABmAABmAABmAABmAABuBmBMAADMAADMAADMAADMAADMAADMAA3IwAGIABGIABGIABGIABGIABGIAB" +
  "GICbEQADMAADMAADMAADMAADMAADMAADcDP6yt+DswlNJ3hHle79nNB1hXs/J3Rd/p6odv/nBO+o0r2fE7oufy9Wu/9zgndU6d7PCV1XuPdzQtfl7x1r939O" +
  "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" +
  "otKHruZOQ/5DV/bBq/nzotKHrhYuQ+FDV4vXIf+hK/vg1dJtUelDV8vPQuFDVysvQv5DV/bBq9VXRaUPXbXehPyHruyDV+13RaUPXXU+hMKHrrqfQv5DV/bB" +
  "q97notKHrvrfh8KHrtZ+DJU+dLX+61D40NXGb0P+Q0v2wavN3xeVPnS19cdQ+NDV9p9D/kNW9sGrnb8Wvdv9W/iz/qz+XeEDWfIYSh/Kco9fn1vVw57ql87I" +
  "8IEsma2lD2W5uVy1EfcZAAMwAAPwPwVw1YOe6hsAAzAAAzAA/0IAVz3gqf4BMAADMAADMABTBQEwAAMwAAPwFwa46sFODycABmAABmAABmCqIAAGYAAGYAD+" +
  "QgBXPdDp4QXAAAzAAAzAAEwVBMAADMAADMD/RYCrHuT0cANgAAZgAAZgAKYKAmAABmAABuCfCXDVA5wefgAMwAAMwAAMwFRBAAzAAAzAAPxPAlz14KbxCYAB" +
  "GIABGIABmCoIgAEYgAEYgP9BgKse2DR+ATAAAzAAAzAAUwUBMAADMAADMABTBQEwAAMwAAPw/wfgqgc1jW8ADMAADMAADMBUQQAMwAAMwAAMwFRBAAzAAAzA" +
  "APyfAFz1gKbxD4ABGIABGIABmCoIgAEYgAEYgAGYKgiAARiAARiA5TFUPZipOQEwAAMwAAMwAFMFATAAAzAAAzAAUwUBMAADMAADMABTBQEwAAMwAAMw+FJF" +
  "ATAAAzAAAzAAUwUBMAADMAADMABTBQEwAAMwAAMwAFMFAbABnJ5wc5qZ2iuatS+E5+amD0LzA2jvWpg5Ci0OoPUtzZ4ULQ+Q9a3MnYVWB9D6WvMXRe0Bsr7O" +
  "wlWoO4D2rt7iTag/gNa3tvS0aH2ArG9j+XlocwDtXVsrL0PbA2h9O6uvi3YHyPr2Wm9D+wNofQft90WHA2R9R52PoeMBtHeddL8NnQ6g9Z31vis6HyDru+j/" +
  "ELocQHvX1dpPoesBsr6b9d+EbgfQ3vV043ehZwNofc83/1D0wm50kXu59afQK8Nx2Ovtv4TeGKy5tzt/K3q3+6/hz/qz+nf5f8f/+1UPY2pefvb6uVy1EfcZ" +
  "AAMwADcc4KoHMTU3AK7BgwBgAAZgAKbmBcA1eBAADMAADMDUvAC4Bg8CgAEYgAGYmhcA1+BBADAAAzAAU/MC4Bo8CAAGYAAGYGpeAFyDBwHAAAzAAEzNC4Br" +
  "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";

class USRKitCustomizer extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    const imgSrc = this.getAttribute("img-src") || PLAYER_IMG_DATA;
    const name = this.getAttribute("name") || "Guest 2X9K";

    this.shadowRoot.innerHTML = `
      <style>
        :host { display:block; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Inter, "Helvetica Neue", Arial, "Apple Color Emoji","Segoe UI Emoji"; color: #fff; }
        .wrap { --navy:${BRAND.navy}; --cyan:${BRAND.cyan}; --pink:${BRAND.pink}; --orange:${BRAND.orange}; --lime:${BRAND.lime};
          background: var(--navy); border-radius: 24px; padding: 18px; 
          box-shadow: 0 20px 60px rgba(0,0,0,.45), inset 0 0 0 1px rgba(255,255,255,.06);
        }
        .grid { display:grid; grid-template-columns: 1.2fr 1fr; gap: 16px; }
        @media (max-width: 980px){ .grid { grid-template-columns: 1fr; } }
        h2 { margin: 0 0 6px; font-weight: 900; letter-spacing: -0.02em; }
        p.sub { margin: 0 0 16px; color: rgba(255,255,255,.6); }
        .panel { background: #0B1022; border-radius: 20px; padding: 16px; box-shadow: inset 0 0 0 1px rgba(255,255,255,.06); }
        .field { margin-bottom: 12px; }
        .label { font-size: 11px; letter-spacing: .12em; opacity: .7; margin-bottom: 6px; text-transform: uppercase; }
        .input, .hex { background: #0E1530; border:1px solid rgba(255,255,255,.12); color: #fff; border-radius: 12px; padding: 10px 12px; width:100%; }
        .row { display:flex; gap:10px; align-items:center; }
        .color { width: 44px; height: 44px; border-radius: 12px; border:1px solid rgba(255,255,255,.1); padding:0; background: transparent; cursor: pointer; }
        .btn { background: rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12); color:#fff; padding:10px 14px; border-radius:14px; font-weight:700; cursor:pointer; }
        .btn.primary { background: linear-gradient(135deg, var(--orange), var(--pink)); border: none; }
        .preset { display:flex; justify-content:space-between; align-items:center; padding:12px; background:#0E1530; border-radius:14px; border:1px solid rgba(255,255,255,.08); cursor:pointer; }
        .preset:hover { border-color: rgba(255,255,255,0.18); }
        .sw { width:16px; height:16px; border-radius:4px; border:1px solid rgba(0,0,0,.2); }
        .right { position:relative; padding:10px; border-radius: 20px; background: #0C132B; overflow:hidden; }
        .glow1, .glow2 { position:absolute; border-radius:999px; filter: blur(40px); opacity:.7; pointer-events:none; }
        .glow1 { width:280px; height:280px; right:-80px; top:-80px; background: radial-gradient(var(--pink), transparent 60%); }
        .glow2 { width:260px; height:260px; left:-80px; bottom:-80px; background: radial-gradient(var(--orange), transparent 60%); }
        .streaks { position:absolute; left:-20px; top:80px; transform: rotate(-12deg); opacity:.55; }
        .streaks div { height:4px; margin:10px 0; border-radius:999px; background: linear-gradient(90deg, transparent, var(--cyan)); }
        .card { position:relative; min-height: 480px; display:grid; grid-template-rows: 1fr auto; }
        .player { width: 100%; max-width: 420px; margin: auto; display:block; filter: drop-shadow(0 30px 60px rgba(0,0,0,.6)); user-select:none; pointer-events:none; }
        .specs { background: rgba(0,0,0,.25); border-radius: 14px; padding: 12px; box-shadow: inset 0 0 0 1px rgba(255,255,255,.06); }
        .spec-row { display:flex; justify-content:space-between; align-items:center; font-size: 14px; margin:8px 0; }
        .spec-row .val { display:flex; gap:8px; align-items:center; }
        .chip { width:12px; height:12px; border-radius:3px; }
        .cta { margin-top:12px; width:100%; color:#0B1220; background: linear-gradient(135deg, var(--cyan), var(--lime)); border:none; padding:12px; font-weight:900; border-radius: 14px; cursor:pointer; }
      </style>
      <div class="wrap">
        <div class="grid">
          <div class="panel">
            <h2>Dial in your kit</h2>
            <p class="sub">Hex friendly. Pick a preset, then tweak.</p>

            <div class="field">
              <div class="label">STRIKER NAME</div>
              <input class="input" id="name" value="${name}" />
            </div>

            <div class="row">
              <div class="field" style="flex:1">
                <div class="label">PRIMARY JERSEY</div>
                <div class="row">
                  <input class="color" id="jerseyColor" type="color" value="${BRAND.pink}" />
                  <input class="hex" id="jerseyHex" value="${BRAND.pink}" />
                </div>
              </div>
              <div class="field" style="flex:1">
                <div class="label">TRIM & PIPING</div>
                <div class="row">
                  <input class="color" id="trimColor" type="color" value="${BRAND.cyan}" />
                  <input class="hex" id="trimHex" value="${BRAND.cyan}" />
                </div>
              </div>
            </div>

            <div class="row">
              <div class="field" style="flex:1">
                <div class="label">SHORTS & SOCKS</div>
                <div class="row">
                  <input class="color" id="shortsColor" type="color" value="#222738" />
                  <input class="hex" id="shortsHex" value="#222738" />
                </div>
              </div>
              <div class="field" style="flex:1">
                <div class="label">BALL ACCENT</div>
                <div class="row">
                  <input class="color" id="ballColor" type="color" value="${BRAND.lime}" />
                  <input class="hex" id="ballHex" value="${BRAND.lime}" />
                </div>
              </div>
            </div>

            <div class="row" style="margin-top:10px">
              <button class="btn" id="surprise">Surprise me</button>
              <button class="btn primary" id="save">Save look & play</button>
            </div>

            <div style="margin-top:14px">
              <div class="label">Club-inspired kits</div>
              <div class="preset" data-kit='{"jersey":"#5AC8FA","trim":"#FFFFFF","shorts":"#0B1220","ball":"#E9FF4F"}'>
                <div>
                  <div style="font-weight:700">Sky Blues</div>
                  <div style="opacity:.6; font-size:12px">Sky blue dominance</div>
                </div>
                <div class="row">
                  <div class="sw" style="background:#5AC8FA"></div>
                  <div class="sw" style="background:#FFFFFF"></div>
                  <div class="sw" style="background:#0B1220"></div>
                  <div class="sw" style="background:#E9FF4F"></div>
                </div>
              </div>
              <div class="preset" data-kit='{"jersey":"#A50044","trim":"#004D98","shorts":"#0B1220","ball":"#FF7A3C"}' style="margin-top:8px">
                <div>
                  <div style="font-weight:700">Blaugrana</div>
                  <div style="opacity:.6; font-size:12px">Deep stripes</div>
                </div>
                <div class="row">
                  <div class="sw" style="background:#A50044"></div>
                  <div class="sw" style="background:#004D98"></div>
                  <div class="sw" style="background:#0B1220"></div>
                  <div class="sw" style="background:#FF7A3C"></div>
                </div>
              </div>
            </div>
          </div>

          <div class="right">
            <div class="glow1"></div><div class="glow2"></div>
            <div class="streaks">
              <div style="width:220px"></div>
              <div style="width:160px"></div>
              <div style="width:120px"></div>
            </div>

            <div class="card">
              <div style="display:flex; justify-content:center; align-items:end; padding: 24px;">
                <img class="player" id="player" alt="USR player" src="${imgSrc}"/>
              </div>

              <div style="padding: 12px;">
                <div class="specs">
                  <div class="spec-row"><div>Striker</div><div class="val"><span id="nameOut">${name}</span></div></div>
                  <div class="spec-row"><div>Jersey</div><div class="val"><span class="chip" id="jerseySw"></span><code id="jerseyOut"></code></div></div>
                  <div class="spec-row"><div>Trim</div><div class="val"><span class="chip" id="trimSw"></span><code id="trimOut"></code></div></div>
                  <div class="spec-row"><div>Shorts & socks</div><div class="val"><span class="chip" id="shortsSw"></span><code id="shortsOut"></code></div></div>
                  <div class="spec-row"><div>Ball accent</div><div class="val"><span class="chip" id="ballSw"></span><code id="ballOut"></code></div></div>
                </div>
                <button class="cta" id="ctaSave">Save look & play</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    const $ = (sel) => this.shadowRoot.querySelector(sel);
    const update = () => {
      $("#nameOut").textContent = $("#name").value;

      const vals = {
        jersey: $("#jerseyHex").value,
        trim: $("#trimHex").value,
        shorts: $("#shortsHex").value,
        ball: $("#ballHex").value
      };
      $("#jerseySw").style.background = vals.jersey; $("#jerseyOut").textContent = vals.jersey;
      $("#trimSw").style.background = vals.trim; $("#trimOut").textContent = vals.trim;
      $("#shortsSw").style.background = vals.shorts; $("#shortsOut").textContent = vals.shorts;
      $("#ballSw").style.background = vals.ball; $("#ballOut").textContent = vals.ball;

      this.dispatchEvent(new CustomEvent("kit-change", {
        detail: this.getState(),
        bubbles: true,
        composed: true
      }));
    };
    update();

    // Wire up inputs
    const linkPick = (pickerSel, hexSel) => {
      const p = this.shadowRoot.querySelector(pickerSel);
      const h = this.shadowRoot.querySelector(hexSel);
      p.addEventListener("input", () => { h.value = p.value; update(); });
      h.addEventListener("input", () => { p.value = h.value; update(); });
    };
    linkPick("#jerseyColor","#jerseyHex");
    linkPick("#trimColor","#trimHex");
    linkPick("#shortsColor","#shortsHex");
    linkPick("#ballColor","#ballHex");
    this.shadowRoot.querySelector("#name").addEventListener("input", update);

    // Presets
    this.shadowRoot.querySelectorAll(".preset").forEach(el => {
      el.addEventListener("click", () => {
        const data = JSON.parse(el.getAttribute("data-kit") || "{}");
        if(data.jersey){ this.shadowRoot.querySelector("#jerseyHex").value = data.jersey; this.shadowRoot.querySelector("#jerseyColor").value = data.jersey; }
        if(data.trim){ this.shadowRoot.querySelector("#trimHex").value = data.trim; this.shadowRoot.querySelector("#trimColor").value = data.trim; }
        if(data.shorts){ this.shadowRoot.querySelector("#shortsHex").value = data.shorts; this.shadowRoot.querySelector("#shortsColor").value = data.shorts; }
        if(data.ball){ this.shadowRoot.querySelector("#ballHex").value = data.ball; this.shadowRoot.querySelector("#ballColor").value = data.ball; }
        update();
      });
    });

    // Surprise me
    const palette = [BRAND.pink, BRAND.orange, "#5865F2", "#8B5CF6", "#10B981", "#22D3EE", "#0EA5E9", "#F97316", "#A3E635"];
    const randomize = () => {
      const pick = () => palette[Math.floor(Math.random()*palette.length)];
      this.shadowRoot.querySelector("#jerseyHex").value = pick(); this.shadowRoot.querySelector("#jerseyColor").value = this.shadowRoot.querySelector("#jerseyHex").value;
      this.shadowRoot.querySelector("#trimHex").value = pick(); this.shadowRoot.querySelector("#trimColor").value = this.shadowRoot.querySelector("#trimHex").value;
      this.shadowRoot.querySelector("#shortsHex").value = "#0B1220"; this.shadowRoot.querySelector("#shortsColor").value = "#0B1220";
      this.shadowRoot.querySelector("#ballHex").value = pick(); this.shadowRoot.querySelector("#ballColor").value = this.shadowRoot.querySelector("#ballHex").value;
      update();
      this.dispatchEvent(new CustomEvent("kit-randomize", { detail: this.getState(), bubbles: true, composed: true }));
    };

    this.shadowRoot.querySelector("#surprise").addEventListener("click", randomize);

    const handleSave = () => {
      this.dispatchEvent(new CustomEvent("kit-save", {
        detail: this.getState(),
        bubbles: true,
        composed: true
      }));
    };
    this.shadowRoot.querySelector("#save").addEventListener("click", handleSave);
    this.shadowRoot.querySelector("#ctaSave").addEventListener("click", handleSave);

    this.randomize = randomize;
    this.update = update;
  }

  getState() {
    const $ = (sel) => this.shadowRoot?.querySelector(sel);
    return {
      name: $("#name")?.value?.trim() || "",
      jersey: $("#jerseyHex")?.value || BRAND.pink,
      trim: $("#trimHex")?.value || BRAND.cyan,
      shorts: $("#shortsHex")?.value || "#222738",
      ball: $("#ballHex")?.value || BRAND.lime
    };
  }

  setState(state = {}) {
    const $ = (sel) => this.shadowRoot?.querySelector(sel);
    if (!this.shadowRoot) return;

    if (state.name !== undefined && $("#name")) $("#name").value = state.name;
    if (state.jersey && $("#jerseyHex")) {
      $("#jerseyHex").value = state.jersey;
      $("#jerseyColor").value = state.jersey;
    }
    if (state.trim && $("#trimHex")) {
      $("#trimHex").value = state.trim;
      $("#trimColor").value = state.trim;
    }
    if (state.shorts && $("#shortsHex")) {
      $("#shortsHex").value = state.shorts;
      $("#shortsColor").value = state.shorts;
    }
    if (state.ball && $("#ballHex")) {
      $("#ballHex").value = state.ball;
      $("#ballColor").value = state.ball;
    }

    this.update?.();
  }
}
customElements.define("usr-kit-customizer", USRKitCustomizer);
