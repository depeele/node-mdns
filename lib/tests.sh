#!/bin/sh

for test in tests/*.js; do
     dir=`dirname  "${test}"`
    base=`basename "${test}" '.js'`

    /bin/echo -n "Testing '${base}'... "
    node "${test}" > test.res
    diff -q test.res "${dir}/${base}.expected" > /dev/null 2>&1
    rc=$?

    if [ ${rc} -ne 0 ]; then
        echo "FAILED"
    else
        echo "pass"
		rm -f test.res
    fi
done
