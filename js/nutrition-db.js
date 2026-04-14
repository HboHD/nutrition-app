// Ingredient nutrition values per 100g: [kcal, protein, carbs, fat]
export const NUT = {
  'jajka': [155, 13, 1, 11], 'masło': [735, 1, 0, 81], 'chleb żytni': [220, 7, 46, 1], 'szpinak': [23, 3, 4, 0],
  'feta': [264, 14, 2, 21], 'pomidory krojone puszka': [25, 1, 4, 0], 'cebula': [40, 1, 9, 0], 'oliwa': [884, 0, 0, 100],
  'tuńczyk puszka': [130, 28, 0, 2], 'majonez': [680, 1, 1, 75], 'twaróg': [120, 18, 4, 4], 'jogurt naturalny': [60, 4, 5, 2],
  'pierś kurczaka': [165, 31, 0, 4], 'mleko kokosowe': [180, 2, 3, 18], 'pasta curry': [150, 3, 10, 11],
  'ryż': [360, 7, 78, 1], 'makaron': [350, 12, 72, 2], 'mięso mielone drobiowe': [143, 17, 0, 8],
  'mięso mielone wieprzowo wołowe': [250, 17, 0, 20], 'wołowina gulaszowa': [250, 26, 0, 16],
  'kasza gryczana': [340, 13, 72, 3], 'kasza jaglana': [360, 11, 70, 3], 'kasza jęczmienna': [350, 10, 73, 2],
  'płatki owsiane': [370, 13, 66, 7], 'masło orzechowe': [588, 25, 20, 50], 'jogurt grecki': [97, 9, 4, 5],
  'białko w proszku': [400, 80, 10, 5], 'mleko': [42, 3, 5, 1], 'banan': [89, 1, 23, 0], 'maliny': [52, 1, 12, 1],
  'serek wiejski': [98, 11, 3, 4], 'ser żółty': [350, 25, 1, 28], 'wędlina': [180, 18, 2, 11],
  'pomidory': [18, 1, 4, 0], 'ogórek': [15, 1, 4, 0], 'papryka': [31, 1, 6, 0], 'cukinia': [17, 1, 3, 0],
  'marchew': [41, 1, 10, 0], 'ziemniaki': [77, 2, 17, 0], 'pieczarki': [22, 3, 3, 0], 'brokuł': [34, 3, 7, 0],
  'halloumi': [320, 22, 2, 25], 'mozzarella': [280, 22, 2, 22], 'camembert': [300, 20, 1, 24],
  'parmezan': [431, 38, 4, 29], 'ser blue': [350, 21, 2, 29], 'serek śmietankowy': [250, 6, 4, 24],
  'łosoś wędzony': [180, 22, 0, 10], 'wątróbka drobiowa': [140, 20, 1, 6], 'udo kurczaka': [180, 18, 0, 12],
  'filet rybny': [82, 18, 0, 1], 'tofu': [76, 8, 2, 5], 'tortilla': [300, 8, 50, 8],
  'ciecierzyca puszka': [120, 7, 16, 3], 'kukurydza puszka': [80, 3, 16, 1],
  'sałata mix': [15, 1, 2, 0], 'rukola': [25, 3, 4, 1], 'pomidory koktajlowe': [18, 1, 4, 0],
  'śliwki suszone': [240, 2, 63, 0], 'orzechy włoskie': [654, 15, 14, 65], 'miód': [304, 0, 82, 0],
  'sos sojowy': [53, 8, 5, 0], 'suszone pomidory w oleju': [213, 6, 12, 15],
  'szynka parmeńska': [270, 26, 0, 18], 'boczek wędzony': [500, 10, 0, 50],
  'pasztet': [320, 10, 5, 29], 'hummus': [166, 8, 14, 10], 'mąka': [340, 10, 72, 1],
  'olej rzepakowy': [884, 0, 0, 100], 'makaron z soczewicy': [340, 24, 48, 2],
  'bułka tarta': [395, 11, 74, 5], 'buraki gotowane': [44, 2, 10, 0],
  'makaron ryżowy': [360, 4, 83, 0], 'gruszka': [57, 0, 15, 0],
  'frytki mrożone': [170, 2, 25, 7]
};

// Ingredient → store department index
// 0:Pieczywo 1:Owoce/warzywa 2:Puszki 3:Suche 4:Jajka/mleko 5:Mięso 6:Nabiał 7:Ryby 8:Mrożonki 9:Inne
export const DEPT = {
  'chleb żytni':0,'tortilla':0,
  'pomidory':1,'pomidory koktajlowe':1,'ogórek':1,'papryka':1,'cebula':1,'marchew':1,'cukinia':1,
  'szpinak':1,'rukola':1,'sałata mix':1,'czosnek':1,'banan':1,'ziemniaki':1,'brokuł':1,'pieczarki':1,'gruszka':1,
  'pomidory krojone puszka':2,'ciecierzyca puszka':2,'kukurydza puszka':2,'fasola puszka':2,'tuńczyk puszka':2,
  'ryż':3,'makaron':3,'makaron z soczewicy':3,'makaron ryżowy':3,'kasza jaglana':3,'kasza gryczana':3,
  'kasza jęczmienna':3,'płatki owsiane':3,'masło orzechowe':3,'suszone pomidory w oleju':3,'śliwki suszone':3,
  'bułka tarta':3,'mąka':4,
  'jajka':4,'mleko':4,
  'pierś kurczaka':5,'mięso mielone drobiowe':5,'mięso mielone wieprzowo wołowe':5,'wołowina gulaszowa':5,
  'udo kurczaka':5,'wątróbka drobiowa':5,'wędlina':5,'boczek wędzony':5,'szynka parmeńska':5,
  'masło':6,'jogurt grecki':6,'jogurt naturalny':6,'serek wiejski':6,'twaróg':6,'feta':6,
  'mozzarella':6,'ser żółty':6,'serek śmietankowy':6,'parmezan':6,'ser blue':6,
  'camembert':6,'halloumi':6,'hummus':6,'pasztet':6,
  'filet rybny':7,'łosoś wędzony':7,
  'maliny':8,'frytki mrożone':8,
  'oliwa':9,'olej rzepakowy':9,'białko w proszku':9,'orzechy włoskie':9,'sos sojowy':9,'miód':9,
  'mleko kokosowe':9,'pasta curry':9,'tofu':9,'buraki gotowane':9
};
export const DEPT_NAMES = ['🥖 Pieczywo','🍌 Owoce / warzywa','🥫 Puszki','🌾 Suche / kasze','🥚 Jajka / mleko / mąka','🥩 Mięso','🧀 Nabiał','🐟 Ryby','❄️ Mrożonki','📦 Inne'];

// Lidl package sizes: [size_value, unit, label]
export const PKG = {
  'jajka':[10,'szt','10 szt'],'mleko':[1000,'ml','1L'],'mąka':[1000,'g','1kg'],
  'masło':[200,'g','200g'],'jogurt grecki':[400,'g','400g'],'jogurt naturalny':[400,'g','400g'],
  'serek wiejski':[200,'g','200g'],'twaróg':[250,'g','250g'],'feta':[200,'g','200g'],
  'mozzarella':[125,'g','125g'],'ser żółty':[250,'g','250g'],'serek śmietankowy':[150,'g','150g'],
  'parmezan':[200,'g','200g'],'camembert':[120,'g','120g'],'halloumi':[200,'g','200g'],
  'pierś kurczaka':[500,'g','500g'],'mięso mielone drobiowe':[500,'g','500g'],
  'mięso mielone wieprzowo wołowe':[500,'g','500g'],'wołowina gulaszowa':[500,'g','500g'],
  'udo kurczaka':[1000,'g','1kg'],'wątróbka drobiowa':[500,'g','500g'],
  'wędlina':[100,'g','100g'],'łosoś wędzony':[100,'g','100g'],'tuńczyk puszka':[170,'g','170g'],
  'filet rybny':[400,'g','400g'],'boczek wędzony':[200,'g','200g'],'szynka parmeńska':[80,'g','80g'],
  'pomidory krojone puszka':[400,'g','400g'],'ciecierzyca puszka':[400,'g','400g'],
  'kukurydza puszka':[340,'g','340g'],'fasola puszka':[400,'g','400g'],
  'ryż':[1000,'g','1kg'],'makaron':[500,'g','500g'],'makaron z soczewicy':[350,'g','350g'],
  'makaron ryżowy':[250,'g','250g'],'kasza jaglana':[400,'g','400g'],'kasza gryczana':[400,'g','400g'],
  'kasza jęczmienna':[400,'g','400g'],'płatki owsiane':[500,'g','500g'],
  'masło orzechowe':[350,'g','350g'],'chleb żytni':[500,'g','500g'],'tortilla':[6,'szt','6 szt'],
  'szpinak':[100,'g','100g'],'rukola':[100,'g','100g'],'sałata mix':[150,'g','150g'],
  'pomidory koktajlowe':[250,'g','250g'],'pieczarki':[250,'g','250g'],
  'oliwa':[500,'ml','500ml'],'olej rzepakowy':[1000,'ml','1L'],
  'orzechy włoskie':[100,'g','100g'],'śliwki suszone':[200,'g','200g'],
  'suszone pomidory w oleju':[280,'g','280g'],'sos sojowy':[250,'ml','250ml'],
  'mleko kokosowe':[400,'ml','400ml'],'pasta curry':[70,'g','70g'],
  'miód':[350,'g','350g'],'hummus':[200,'g','200g'],'pasztet':[130,'g','130g'],
  'bułka tarta':[200,'g','200g'],'frytki mrożone':[1000,'g','1kg'],
  'maliny':[300,'g','300g'],'tofu':[400,'g','400g']
};
