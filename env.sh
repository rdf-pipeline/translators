# source this to get node_modules/.bin in your path. Must be at the root of the project

here=$(readlink -f $(dirname ${BASH_SOURCE}))
PATH=${here}/node_modules/.bin:$PATH

