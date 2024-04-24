# Bouwlogistiek
De bouwlogistiek use-case, gebaseerd op het Digitale Tweeling Platform, brengt de te verwachten logistieke verkeersstromen in kaart op basis van de geplande (nieuwbouw-)projecten. De verkeersstroom van bouwlogistiek kan voor directe overlast (oa verkeersstremming, veiligheid) en indirecte overlast (oa luchtkwaliteit, uitstoot) zorgen. Deze use-case maakt niet alleen de negatieve effecten van bouwlogistiek zichtbaar zodat er op geanticipeerd kan worden, het verkend ook mogelijke oplossingen zoals logistieke hubs en vervoer over water. 

## Inhoud
Deze repositiry is een use-case gebaseerd op het [https://github.com/AnalyzebyKBenP/Digitale-Tweeling-Platform](Digitale Tweeling Platform). De `Shared` map uit die repo moet in dezelfde _root_ staan als de `logsitiek` map uit deze repo.

## Setup
Het Digitale Tweeling platform is ontworpen om binnen Azure te draaien en maakt gebruikt van Azure RBAC om toegang te krijgen tot een Azure Maps licentie en (desgewenst) data in storage accounts. Kaartdata wordt op basis van metadata rechtstreeks uit de bron opgevraagd.
| env_name    | datatype | description                 |
|-------------|----------|-----------------------------|
| AzureMapsClientId | string   | Azure maps subscription Client ID |
| build_id       | string  | Build ID |
| Geoserver_Auth    | string   | Auth header voor Geoserver |
| subscription_id    | string   | Azure SubscriptionID |

## Contact

Voor vragen over het bouwlogistiek dashboard en implementatie kunt u contact opnemen met:
- Wouter Huijzendveld
- 06 – 10 39 59 35
- email : info@analyze.nl
- of via de website [analyze.nl](https://analyze.nl)


## Licentie

[CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/legalcode.txt)
