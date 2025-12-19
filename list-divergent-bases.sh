#!/bin/bash
for x in $(seq 137 ${1:-10000}); do
  result=$(node efdr.mjs both base=$x +0 "superquiet=@@dsfl[1]|@@Dsfl[1]|")
  lower=$(echo "$result" | cut -d'|' -f1)
  upper=$(echo "$result" | cut -d'|' -f2)
  if [ "$lower" != "$upper" ]; then
    n=$(($n+1))
    printf "$x,"
  fi
done
