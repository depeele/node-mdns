#!/bin/sh

for test in tests/*.js; do
     dir=`dirname  "${test}"`
    base=`basename "${test}" '.js'`
     exp="${dir}/${base}.expected"
    if [ ! -f "${exp}" ]; then
        continue;
    fi

    /bin/echo -n "Testing '${base}'... "
    node "${test}" > test.res
    diff -q test.res "${exp}" > /dev/null 2>&1
    rc=$?

    if [ ${rc} -ne 0 ]; then
        echo "FAILED"
    else
        echo "pass"
        rm -f test.res
    fi
done
