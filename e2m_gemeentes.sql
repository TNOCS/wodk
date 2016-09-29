select ster_0,ster_1,ster_2,ster_3,ster_4,ster_5,ster_onb,ster_in_ond,ster_totaal,a_huko_onb,a_koopwon,
a_huurwon,a_1gezw,a_mgezw,concat('GM',lpad(gemeentecode::text, 4, '0')) as GM_CODE,gemeentenaam,aant_inw
from bagactueel.gemeente