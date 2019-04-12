---
layout:     post
title:      "Building Windows PE disks on Linux"
date:       2019-01-12 17:30:30 +0100
categories: linux windows
published:  true
---

## What?

<img style="float: right;" src="/assets/hdd.png" width="380px"/>

We've got modified Windows PE10 ISO image constructed using the Windows Assessment and Deployment Kit (WADK) and
we need to boot those ISOs on EC2 machines. EC2 doesn't have a notion of ISO images, so we must turn these into
a disk.

## Why Linux?!

I'll agree this does at first sound a little bit like a fool's errand - but there is a method to this madness:

1. We've already got scripting tools to control VHD creation, partitions and grub
2. We can make Linux machines with wimlib more easily than Windows machines with the right WADK

The second point was really important to us. The build system is emphemeral, so we want puppet configurations
and/or packer images with the tools built in. This is much easier to do on Linux still, even though Windows
(e.g. via Chocolatey) has got a lot better in recent years.

## How?

# The WIM file

The Windows image file is just a compressed RAM Disk with a set of tools that can dump it to disk, append
other bits to it etc... There will be one somewhere on the ISO:

~~~
# iso-read -i <ISO> -o boot.wim -e /sources/boot.wim
~~~

Now we've got a WIM file, we can make a disk.

# Windows-first... but just the once

Most of the information here comes from this thread:
http://reboot.pro/topic/20468-create-a-windows-system-from-scratch-using-linux/page-2

The only hard bits were making the BCD and making a good MBR entry / signature. It turned out the
_easiest_ way to do that... is to just copy it from Windows. Yes, that is a bit like cheating...
but its worth it to get the rest of the procedure into the CI system.

On a Windows machine create a VHD from the WIM file by mounting a blank VHD with a single NTFS
partition as `V:` then:

~~~
# dism.exe /Apply-Image /ImageFile:boot.wim /Index:1 /ApplyDir:V:\
# bootsect /nt60 V:
# bootsect /nt60 V: /force /mbr
# bootbcd V:\Windows /s V: /f ALL
# bcdedit /store V:\Boot\BCD /set {default} bootstatuspolicy ignoreall failures
# bcdedit /store V:\Boot\BCD /set {default} detecthal yes
~~~

On a Linux box grab the BCD and MBR:

~~~
# qemu-nbd -c /dev/nbd0 my.vhd
# kpartx -auv /dev/nbd0
# mount /dev/mapper/nbd0p1 windows
# cp windows/Boot/BCD pe10.bcd
# dd if=/dev/nbd0 of=pe10.mbr bs=512 count=1
~~~

# Make a disk and loop device of the right size

~~~
# dd if=/dev/zero of=disk_image.raw bs=1 count=1 seek=1536M
# losetup -f disk_image.raw
~~~

<blockquote>
*Side bar* Really make sure this is a multiple of 256MB, otherwise EC2 gets rather upset and is not very vocal about it.
</blockquote>

We've now got `/dev/loop0` as a block device backing onto `disk_image.raw` which is a 1.5GB sparse file.

# Partition the disk

You can actually do this without the loopback, but we've got it anyway so we might as well use it.
Just create a partition that fills the whole disk, make it bootable and ensure its type is NTFS:

~~~
# fdisk /dev/loop0
...
Disklabel type: dos
Disk identifier: 0x59b584ff

Command (m for help): p
Device     Boot Start     End Sectors  Size Id Type
/dev/loop0 *     2048 3355441 3353394  1.6G  7 HPFS/NTFS/exFAT

Command (m for help): w 
The partition table has been altered.
Syncing disks.
~~~

# Create a new NTFS volume and unpack the WIM

This bit is easy once wimlib is installed. Map the new partition,
construct an NTFS filesystem on it, unpack the WIM file then mount
up the resulting folder:

~~~
# kpartx -auv /dev/loop0
# mkfs.ntfs /dev/mapper/loop0p1
# wimapply boot.wim /dev/mapper/loop0p1
# mount /dev/mapper/loop0p1 test
~~~

# The ugly bit... fake up the boot system

After making the Windows image I ran md5sum on the various boot files
and it turns out these all exist elsewhere in the WIM and can just be
copied to the right place. Easy.

~~~
# mkdir -p test/Boot/grub2 test/Boot/Resources/en-US
# cp test/Windows/Boot/PCAT/bootmgr test/
# cp test/Windows/Boot/Resources/*.dll test/Boot/Resources
# cp test/Windows/Boot/Resources/en-US/* test/Boot/Resources/en-US/
~~~

# The _really_ ugly bit... copy over a BCD and MBR

This was just figured out by trial and error... the BCD file is actually
just a registry file, but sadly obfuscated. There is some information that
covers what the various bits mean... but that doesn't matter. If you copy
the lot en-masse... then it just works!

~~~
# cp pe10.bcd test/Boot/BCD
# dd if=pe10.mbr of=/dev/loop0 bs=446 count=1
~~~

# Install grub (not that ugly?)

~~~
# cat > test/Boot/grub2/grub.cfg
set default=0
set timeout=5
menuentry 'Windows CD' {
    search -s root -f /Boot/BCD
    ntldr /bootmgr
}
# grub2-install --target=i386-pc --root-directory=test --boot-directory=test/Boot /dev/loop0
~~~

# Done!

So now we've got a RAW file we can covert (`qemu-img` works nicely) to VHD and upload to
EC2 as an AMI. We added a test loop into the CI system that fires up an instance with this
image so we got:

`Build Image` → `Upload Image` → `Boot image` → `Record screenshots`

All as part of our CI image. So once the Windows portion of the build is complete the
chain kicks off and we get a good or bad result within 10 minutes. Not bad.

## Hang-on... what about:

# Where do I get wimlib?

Its available in a number of repositories for many distros, for RPM distros though
it has a perfectly serviceable spec file to build it:

~~~
# curl -LO https://wimlib.net/downloads/wimlib-${version}.tar.gz
# tar xf wimlib-${version}.tar.gz
# cp wimlib-${version}/rpm/wim*.spec ~/rpmbuild/SPECS
# cp wimlib-${version}.tar.gz ~/rpmbuild/SOURCES
# rpmbuild -ba ~/rpmbuild/SPECS/wim*.spec
~~~

# Why not use wimboot instead?

This actually worked really well... right up until it didn't. The resulting disks worked perfectly on vSphere,
KVM and Xen, but failed in weird and wonderful ways when uploaded to EC2. It seems that loading a sufficiently
large filesystem in RAM via Grub doesn't work on EC2 - which create I/O failures when accessing side-by-side
assemblies.
