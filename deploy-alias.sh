if [ -z "$1" ]
  then
    echo "Must provide a target url, something like dupe-report-abc123.now.sh"
fi
now alias rm artsy-dupe-report.now.sh && now alias set $1 artsy-dupe-report.now.sh