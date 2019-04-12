---
layout: page
title: Projects
permalink: /projects/
---

# Cross-compilation of AIX binaries

[GitHub link](https://github.com/JamesReynolds/binutils-gdb)

From a completely non-functional result the AIX binutils / gcc builds
as far as some relatively complex exception catching cases on 32-bit
PPC AIX. The 64-bit cases are currently hampered by figuring out the
correct linking of the `XMC_XO` linker instruction used to pull
assembly directly into binaries for things like `memset` etc...

# A simple staged RPM store

No github link yet, repository is private until I've finished
the initial structure.
