dotnet restore
dotnet publish -c Release -f net8.0 -o .\publish
Compress-Archive -Path .\publish\* -DestinationPath .\hackyeah-raw-data.zip -Force