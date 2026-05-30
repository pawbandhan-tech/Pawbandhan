# Run after: vercel login (pawbandhan-tech Vercel team account)
Set-Location $PSScriptRoot\..
npx vercel@latest link --yes --project prj_7Ulm0bcjhPlDolg7S4gbYie4vOpT
npx vercel@latest deploy --prod --yes
