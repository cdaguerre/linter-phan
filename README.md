linter-phan
=========================

This linter plugin for [Linter](https://github.com/AtomLinter/Linter) provides
an interface to [Phan](https://github.com/phan/phan). It will be
used with files that have the "PHP" syntax or PHP embedded within HTML.

## Installation
### Phan installation
Before installing this plugin, you must ensure that `phan` is installed on your
system. For detailed instructions see [Phan Github](https://github.com/phan/phan),
the simplified steps are:

0. Install [php](http://php.net).
0. Install [Composer](https://getcomposer.org/download/).
0. Install `phan` by typing the following in a terminal:
```ShellSession
composer global require phan/phan
```

After verifying that `phan` works from your terminal, proceed to install the linter-phan plugin.

### Plugin installation
```ShellSession
$ apm install linter-phan
```