###Disclaimer

Het model ‘woningaanpassingen’ classificeert alle woningen van de Nederlandse woningvoorraad op de mate van geschiktheid en aanpasbaarheid voor mensen met mobiliteitsbeperkingen (zie 1.). Het betreft ca. 7,5 miljoen woningen. Gezien dit enorme aantal zijn deze woningen niet één voor één geïnspecteerd.
In het BAG-bestand (zie 2.) staan alle 7,5 miljoen woningen met adressen (=locatie) die in gebruik zijn. Per woning is tevens een aantal woning- en gebouwkenmerken opgenomen. Het bestand 3D Gebouwhoogte NL (zie 2.) bevat van alle woongebouwen de hoogte. Door de koppeling van bepaalde woning- en gebouwkenmerken uit het BAG-bestand en 3D Gebouwhoogte NL (zie 3.) kan 92% van de woongebouwen geclassificeerd worden. Voor het deel waarvan de kenmerken uit het BAG-bestand niet afdoende zijn om de woningen met een zekere mate van betrouwbaarheid te classificeren wordt momenteel een aanvullend liftonderzoek uitgevoerd.
TNO kan geen verantwoordelijkheid nemen voor de juistheid van de gegevens in de genoemde bronbestanden van de BAG en het Kadaster. De gekozen koppeling van woning- en gebouwkenmerken is gebaseerd op expert-opinion en getoetst aan een gedetailleerd woningbestand van de gemeente Rotterdam. TNO heeft de uitgangspunten voor de classificering van de woningen zorgvuldig afgewogen op de mate van betrouwbaarheid (zie 3.), maar kan geen garantie bieden voor een volledige correctheid. 

####1.	Classificering woningvoorraad: niet-aanpasbaar | aanpasbaar | specifiek
De toegankelijkheid van de woningen wordt in zes niveaus onderscheiden. Per twee niveaus worden de woningen geclusterd tot drie hoofdgroepen: niet-aanpasbare, aanpasbare en specifieke woningen. In figuur 1 is deze classificatie schematisch weergegeven.

![woning_classificatie](public/images/woning_classificatie.png)
Figuur 1: Classificatie woningvoorraad op toegankelijkheid en aanpasbaarheid

####2.	Bronbestanden: BAG en 3D Gebouwhoogte NL
Over BAG ([http://www.data.overheid.nl](http://www.data.overheid.nl "www.data.overheid.nl")):
De BAG (Basisregistraties adressen en gebouwen) is onderdeel van het overheidsstelsel van basisregistraties. Gemeenten zijn bronhouders van de BAG. Zij zijn verantwoordelijk voor het opnemen van de gegevens in de BAG en voor de kwaliteit ervan. Alle gemeenten stellen gegevens over adressen en gebouwen centraal beschikbaar via de Landelijke Voorziening (BAGLV). Het Kadaster beheert de BAGLV en stelt de gegevens beschikbaar aan de diverse afnemers.

De BAG bevat informatie over 5 objectsoorten: panden, verblijfsobjecten, nummeraanduidingen, openbare ruimtes en woonplaatsen. De attributen zijn onder andere status, oppervlak, geometrie, x-y-coördinaat, bouwjaar en gebruiksdoel.

De BAG bevat deze gegevens van alle panden in Nederland.

Over 3D Gebouwhoogte NL ([http://www.kadaster.nl/3dgebouwhoogte](http://www.kadaster.nl/3dgebouwhoogte "www.kadaster.nl/3dgebouwhoogte")):
3D Gebouwhoogte NL bevat voor 99,7% van alle TOP10NL gebouwen de 2D geometrieën met gegeneraliseerde gebouwhoogten, toegevoegd als attributen. Dat zijn 2.992.613 TOP10NL gebouwen (versie R2 2014). De hoogten komen uit het Actuele Hoogte Bestand Nederland (AHN), zie [http://www.ahn.nl](http://www.ahn.nl "www.ahn.nl"). Zij zijn in een automatisch proces aan de 2D geometrieën gekoppeld via een point-in-polygoon procedure. Vanwege het tijdsverschil in opname tussen AHN2 en TOP10NL van soms enkele jaren, kunnen er inconsistenties optreden in het bestand.

####3.	Uitgangspunten voor de classificering
De gekozen uitgangspunten van de woning- en gebouwkenmerken voor de classificering van de woningvoorraad voor meergezinswoningen is als volgt:
1.	Woongebouwen met een bouwjaar van voor 1930 hebben geen lift, dus de bovenwoningen van het woongebouw zijn ongeschikt en niet aan te passen voor de doelgroep;
2.	Woongebouwen met een bouwjaar vanaf 1930 en een bouwhoogte vanaf 17 meter hebben een lift, dus alle woningen van dat woongebouw zijn geschikt voor de doelgroep;
3.	Woongebouwen met een bouwjaar vanaf 1930, een bouwhoogte lager dan 17 meter en minder dan 9 woningen hebben geen lift, dus de boven gelegen portiekwoningen zijn ongeschikt en niet aan te passen voor de doelgroep;
4.	Woongebouwen met een bouwjaar vanaf 1992, een bouwhoogte lager dan 17 meter, meer dan 8 woningen in het pand en een gebruiksoppervlakte groter dan 3500 m2 hebben een lift, dus alle woningen van dat woongebouw zijn geschikt voor de doelgroep;
5.	Woongebouwen die niet aan de eerste 4 uitgangspunten voldoen worden onderzocht op de aanwezigheid van een lift. Deze nog niet onderzochte gebouwen zijn zwart gearceerd;
6.	Appartementen die niet op maaiveld gelegen zijn en niet bereikbaar zijn met een lift, zijn niet toegankelijk en niet aanpasbaar voor de doelgroep;
7.	Appartementen die op maaiveld gelegen zijn of bereikbaar zijn met een lift, zijn toegankelijk en aanpasbaar voor de doelgroep.

De gekozen uitgangspunten van de woning- en gebouwkenmerken voor de classificering van de woningvoorraad voor eengezinswoningen is als volgt:
8.	Eengezinswoningen met een bouwhoogte lager dan 5 meter hebben één woonlaag en zijn gelijkvloers. Deze woningen zijn toegankelijk en aanpasbaar voor de doelgroep;
9.	Eengezinswoningen met een bouwhoogte vanaf 5 meter hebben minimaal twee woonlagen. Bij 95% van deze woningen kan zonder bouwkundige ingrepen een traplift geplaatst worden. Deze woningen zijn toegankelijk en aanpasbaar voor de doelgroep.

*Ad 1.	Bouwjaar voor 1930*
De hypothese dat woongebouwen met een bouwjaar voor 1930 geen lift hebben is getoetst op 115.000 woningen in Rotterdam. Van deze woningen zijn er 88.098 gelegen in een appartementengebouw, waarvan ruim 17.000 appartementen een bouwjaar voor 1930 hebben. De foutmarge bleek 0,85%.

*Ad 2.	Bouwjaar vanaf 1930; bouwhoogte ≥ 17 meter*
Sinds het Bouwbesluit van 1992 is het verplicht een lift te realiseren indien de vloer van een verblijfsgebied hoger is gelegen dan 12,5 meter boven het aansluitende terrein, gemeten ter plaatse van de toegang van het woongebouw. In de jaren dertig – vijftig, was het algemeen aanvaard dat de eerste vier woonlagen van een appartementencomplex zonder lift bereikbaar waren. Omdat de behoefte aan goedkope arbeiderswoningen erg groot was, zijn ook ontwerpen gemaakt met vijfwoonlagen zonder lift (bron: Goedkope arbeiderswoningen (1936) F. Ottenhof, red.; herdruk 1981 door Van Gennep Amsterdam). Vandaar dat een bouwhoogte van 17 meter gekozen is voor de aanwezigheid van een lift.

*Ad 3.	Bouwjaar vanaf 1930, bouwhoogte < 17 meter en ≤ 8 woningen in het pand*
De hypothese dat woongebouwen met een bouwjaar vanaf 1930, een bouwhoogte lager dan 17 meter en minder dan 9 woningen in het pand is getoetst op 115.000 woningen in Rotterdam. De gemiddelde foutmarge bleek 1,5%. Bij woongebouwen met 7 en 8 woningen in het pand was de foutmarge 3%.
In de crisisjaren 1929-1940 en ook in de eerste jaren na de Tweede Wereldoorlog was er grote behoefte aan goedkope arbeiderswoningen. Een lift paste niet in dat plaatje. Het was algemeen aanvaard dat de eerste vier woonlagen van een appartementencomplex zonder lift bereikbaar waren (bron: Goedkope arbeiderswoningen (1936) F. Ottenhof, red.; herdruk 1981 door Van Gennep Amsterdam). Bij portiekontsluiting betekent dit maximaal 8 woningen in een pand. Bij renovatie van een complex kan uiteraard een lift toegevoegd zijn.

*Ad 4.	Bouwjaar vanaf 1992; bouwhoogte < 17 meter; > 8 woningen in het pand; gebruiksoppervlakte > 3500 m2*
Sinds het Bouwbesluit van 1992 is het verplicht een lift te realiseren bij een totale gebruiksoppervlakte van meer dan 3500 m2.

*Ad 5.	Het liftonderzoek is gaande.*
De classificering van deze woningen is vooralsnog onbekend. Deze woningen zijn momenteel zwart gearceerd.
