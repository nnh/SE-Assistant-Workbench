check_ad_hosp_list <- data.frame(uid=character(), ad=character(), stringsAsFactors=F)
checked_uid_list <- c("WOS:000795122700012", # https://pubmed.ncbi.nlm.nih.gov/35489768/
                      "WOS:000803593000001", # https://pubmed.ncbi.nlm.nih.gov/35215263/
                      "WOS:001091166800001") # https://pubmed.ncbi.nlm.nih.gov/37876022/
check_ad_hosp_name_list <- c("(?i)shizuoka med ctr",
                             "(?i)mie natl hosp",
                             "(?i)natl mie hosp",
                             "(?i)kure med ctr",
                             "(?i)hiroshima nishi med ctr",
                             "(?i)Shikoku Med Ctr Children & Adults",
                             "(?i)Disaster med ctr",
                             "(?i)ureshino med ctr",
                             "(?i)asahikawa med ctr",
                             "(?i)Shimoshizu natl hosp",
                             "(?i)kumamoto med ctr",
                             "(?i)yonago med ctr",
                             "(?i)Sendai Nishitaga hosp",
                             "(?i)Shikoku canc ctr",
                             "(?i)Mie Chuo med ctr",
                             "(?i)Iwakuni clin ctr",
                             "(?i)Takasaki gen med ctr",
                             "(?i)Hokkaido canc ctr",
                             "(?i)Nagoya med ctr",
                             "(?i)Kinki Chuo Chest med ctr",
                             "(?i)okayama med ctr",
                             "(?i)Nishisaitama Chuo natl hosp",
                             "(?i)murayama med ctr",
                             "(?i)Kyushu canc ctr",
                             "(?i)Beppu med ctr",
                             "(?i)Kanmon med ctr",
                             "(?i)Niigata natl hosp",
                             "(?i)kyushu med ctr",
                             "(?i)Nagasaki Kawatana med ctr",
                             "(?i)Toyohashi med ctr",
                             "(?i)Kasumigaura med ctr",
                             "(?i)Osaka natl hosp",
                             "(?i)Fukuoka higashi med ctr",
                             "(?i)Nagasaki natl hosp",
                             "(?i)Tokyo med ctr",
                             "(?i)Hakodate natl hosp",
                             "(?i)Toneyama med ctr",
                             "(?i)Kokura med ctr",
                             "(?i)Sagamihara natl hosp",
                             "(?i)Nishiniigata Chuo hosp",
                             "(?i)Utano natl hosp",
                             "(?i)Oita med ctr",
                             "(?i)Higashihiroshima med ctr",
                             "(?i)Higashi hiroshima med ctr",
                             "(?i)Yamaguchi Ube med ctr",
                             "(?i)Fukuyama med ctr",
                             "(?i)Aomori natl hosp",
                             "(?i)Hokuriku natl hosp",
                             "(?i)Nagara med ctr",
                             "(?i)Higashisaitama natl hosp",
                             "(?i)Osaka Minami med ctr",
                             "(?i)Shizuoka Inst Epilepsy",
                             "(?i)Tenryu hosp",
                             "(?i)Ehime med ctr",
                             "(?i)Kanazawa med ctr",
                             "(?i)Higashi Ohmi gen med ctr",
                             "(?i)Hirosaki natl hosp",
                             "(?i)Natl Saitama Hosp",
                             "(?i)Higashinagoya natl hosp",
                             "(?i)Miyakonojo med ctr",
                             "(?i)Fukushima natl hosp",
                             "(?i)Hamada med ctr",
                             "(?i)Fukuoka natl hosp",
                             "(?i)mito med ctr",
                             "(?i)nagasaki hosp"
)
kPostalCode <- c('0030804','0630005','0418512','0708644','0808518','0368545','0310003','0381331','0200133','0250033','0210056','0260053','9838520','9828555','9892202','0181393','9900876','9921202','9628507','9718126','3113193','3008585','3191113','3208580','3291193','3700829','3780051','3770280','3591151','3510102','3490196','2608606','2608712','2660007','2840003','1528902','1900014','2048585','2080011','2458575','2390841','2500032','2520392','2578585','9502085','9458585','9493193','4008533','3818567','3998701','3868610','3848540','9392692','9391893','9208650','9200192',' 926853','9220405','5028558','4208688','4348511','4118611','4600001','4658620','4630802','4408510','5140125','5138501','5141101','5141292','9140195','9104272','5278505','5291803','6128555','6168255','6258502','6100113','5400006','5918555','5608552','5868521','6540155','6708520','6751327','6691592','6308053','6391042','6468558','6440044','6890203','6830006','6908556','6978511','7011192','7010304','7370023','7208520','7390696','7390041','7392693','7528510','7550241','7408510','7421352','7790193','7768585','7610193','7658507','7910280','7910281','7808077','8028533','8111395','8108563','8111394','8370911','8113195','8498577','8420192','8490101','8430393','8508523','8568562','8593615','8600008','8690593','8611116','8611196','8700263','8740011','8740840','8800911','8850014','8891301','8920853','8910498','8995293','9012214','9041201')
kDept <- c("",
           "Breast Surg, ",
           "Cardiol, ",
           "Clin Lab, ",
           "Clin Res Ctr, ",
           "Clin Res Ctr Allergy & Rheumatol, ",
           "Clin Res Ctr, Dept Adv Diag, ",
           "Clin Res Ctr, Dept Infect Dis & Immunol, ",
           "Clin Res Ctr, Dept Pathol, ",
           "Dent & Oral Surg, ",
           "Dept Anesthesiol, ",
           "Dept Breast Surg, ",
           "Dept Breast & Endocrine Surg, ",
           "Dept Cardiol, ",
           "Dept Cardiothorac Surg, ",
           "Dept Cardiovasc Surg, ",
           "Dept Cardiovasc Med, ",
           "Dept Clin Lab, ",
           "Dept Clin Lab & Diagnost Pathol, ",
           "Dept Clin Oral Oncol, ",
           "Dept Clin Sci, ",
           "Dept Clin Res, ",
           "Dept Crit Care Med, ",
           "Dept Dermatol, ",
           "Dept Diagnost Pathol, ",
           "Dept Digest Internal Med, ",
           "Dept Emergency Med, ",
           "Dept Fetal Maternal Med, ",
           "Dept Gastroenterol, ",
           "Dept Gastrointestinal Surg, ",
           "Dept Gastroenterol Surg, ",
           "Dept Gen Thorac Surg, ",
           "Dept Hematol, ",
           "Dept Infect Dis, ",
           "Dept Internal Med, ",
           "Dept Internal Med, Div Resp Med, ",
           "Dept Lab Med & Pathol, ",
           "Dept Med, ",
           "Dept Med Oncol, ",
           "Dept Neurol, ",
           "Dept Neonatol, ",
           "Dept Neurosurg, ",
           "Dept Neuropsychiat, ",
           "Dept Obstet & Gynecol, ",
           "Dept Otorhinolaryngol, ",
           "Dept Ophthalmol, ",
           "Dept Oral & Maxillofacial Surg, ",
           "Dept Oral Oncol, ",
           "Dept Oral Surg Oncol, ",
           "Dept Orthoped & Rehabil, ",
           "Dept Orthoped Surg & Rheumatol, ",
           "Dept Orthopaed, ",
           "Dept Orthopaed Surg, ",
           "Dept Orthoped, ",
           "Dept Orthoped Surg, ",
           "Dept Pathol, ",
           "Dept Pediat, ",
           "Dept Pediat Hematol Oncol, ",
           "Dept Pulm Med, ",
           "Dept Psychosomat Internal Med, ",
           "Dept Rehabil Med, ",
           "Dept Rehabil, ",
           "Dept Rheumatol, ",
           "Dept Surg, ",
           "Dept Thorac Oncol, ",
           "Dept Thorac Surg, ",
           "Dept Radiol, ",
           "Dept Radiat Oncol, ",
           "Dept Radiat Therapy, ",
           "Dept Resp Internal Med, ",
           "Dept Resp Med, ",
           "Dept Urol, ",
           "Dept Vasc Surg, ",
           "Div Cardiovasc Surg, ",
           "Div Gastroenterol, ",
           "Div Gen Thorac Surg, ",
           "Div Infect Dis & Resp Med, ",
           "Div Internal Med, ",
           "Div Neurol, ",
           "Gen Thorac Surg, ",
           "Inst Clin Res, Div Stem Cell Res, ",
           "Internal Med, ",
           "Neurol, ",
           "Neurosurg, ",
           "Nursing Div, ",
           "Otolaryngol Head & Neck Surg, ",
           "Oral & Maxillofacial Surg, ",
           "Pediat, ",
           "Pediat Cardiol, ",
           "Resp Med, ")
local({
  kExcludeAomoriNatlHosp <- "Aomori Natl Hosp, " %>% str_c(kDept) %>%
    map( ~ str_c(., c("Namioka, Aomori 0381338, Japan"))) %>% unlist()
  kExcludeAsaihkawaMedCtr <- "Asahikawa Med Ctr, " %>% str_c(kDept) %>%
    map( ~ str_c(., c("Asahikawa, Hokkaido, Japan", "Asahikawa, Japan"))) %>% unlist()
  kExcludeBeppuMedCtr <- "Beppu Med Ctr, " %>% str_c(kDept) %>%
    map( ~ str_c(., c("Beppu, Oita, Japan", "Oita, Japan"))) %>% unlist()
  kExcludeFukushimaNatlHosp <-  "Fukushima Natl Hosp, " %>% str_c(kDept) %>%
    map( ~ str_c(., c("13 Ashidazuka, Sukagawa City, Fukushima, Japan"))) %>% unlist()
  kExcludeFukuokaHigashiMedCtr <-  "Fukuoka Higashi Med Ctr, " %>% str_c(kDept) %>%
    map( ~ str_c(., c("Koga, Fukuoka, Japan"))) %>% unlist()
  kExcludeFukuokaNatlHosp <-  "Fukuoka Natl Hosp, " %>% str_c(kDept) %>%
    map( ~ str_c(., c("Fukuoka, Japan"))) %>% unlist()
  kExcludeFukuyamaMedCtr <- "Fukuyama Med Ctr, " %>% str_c(kDept) %>%
    map( ~ str_c(., c("Hiroshima, Japan", "Fukuyama, Japan", "Okayama, Japan", "Fukuyama, Hiroshima, Japan"))) %>% unlist()
  kExcludeHakodateNatlHosp <- "Hakodate Natl Hosp, " %>% str_c(kDept) %>%
    map( ~ str_c(., c("Hakodate, Japan", "Hakodate, Hokkaido, Japan"))) %>% unlist()
  kExcludeHigashinagoyaNatlHosp <- "Higashinagoya Natl Hosp, " %>% str_c(kDept) %>%
    map( ~ str_c(., c("Nagoya, Aichi, Japan"))) %>% unlist()
  kExcludeHigashisaitamaNatlHosp <- "Higashisaitama Natl Hosp, " %>% str_c(kDept) %>%
    map( ~ str_c(., c("Hasuda, Japan"))) %>% unlist()
  kExcludeHigashiOhmiGenMedCtr <- "Higashi Ohmi Gen Med Ctr, " %>% str_c(kDept) %>%
    map( ~ str_c(., c("255 Gochicho, Higashiomi, Shiga 5270044, Japan", "Higashi Ohmi, Japan"))) %>% unlist()
  kExcludeHigashiHiroshimaMedCtr <- "Higashi Hiroshima Med Ctr, " %>% str_c(kDept) %>%
    map( ~ str_c(., c("Hiroshima, Japan", "Higashihiroshima, Japan"))) %>% unlist()
  kExcludeHigashihiroshimaMedCtr <- "Higashihiroshima Med Ctr, " %>% str_c(kDept) %>%
    map( ~ str_c(., c("Hiroshima, Japan", "Higashihiroshima, Japan"))) %>% unlist()
  kExcludeHirosakiNatlHosp <- "Hirosaki Natl Hosp, " %>% str_c(kDept) %>%
    map( ~ str_c(., c("Hirosaki, Aomori, Japan", "Aomori, Japan"))) %>% unlist()
  kExcludeHiroshimaNishiMedCtr <- "Hiroshima Nishi Med Ctr, " %>% str_c(kDept) %>%
    map( ~ str_c(., c("Otake, Japan"))) %>% unlist()
  kExcludeHokkaidoCancCtr <- "Hokkaido Canc Ctr, " %>% str_c(kDept) %>%
    map( ~ str_c(., c("Sapporo, Hokkaido, Japan", "Sapporo, Japan", "Sapporo 0600042, Japan"))) %>% unlist()
  kExcludeHokurikuNatlHosp <- "Hokuriku Natl Hosp, " %>% str_c(kDept) %>%
    map( ~ str_c(., c("Nanto, Toyama, Japan"))) %>% unlist()
  kExcludeIwakuniClinCtr <- "Iwakuni Clin Ctr, " %>% str_c(kDept) %>%
    map( ~ str_c(., c("Iwakuni, Japan", "Yamaguchi, Japan", "Iwakuni, Yamaguchi, Japan"))) %>% unlist()
  kExcludeKanazawaMedCtr <- "Kanazawa Med Ctr, " %>% str_c(kDept) %>%
    map( ~ str_c(., c("Kanazawa, Ishikawa, Japan"))) %>% unlist()
  kExcludeKanmonMedCtr <- "Kanmon Med Ctr, " %>% str_c(kDept) %>%
    map( ~ str_c(., c("Yamaguchi, Japan"))) %>% unlist()
  kExcludeKasumigauraMedCtr <- "Kasumigaura Med Ctr, " %>% str_c(kDept) %>%
    map( ~ str_c(., c("Tsuchiura, Ibaraki, Japan", "2-7-14 Shimotakatsu, Tsuchiura, Ibaraki, Japan", "Ibaraki, Japan"))) %>% unlist()
  kExcludeKinkiChuoChestMedCtr <- "Kinki Chuo Chest Med Ctr, " %>% str_c(kDept) %>%
    map( ~ str_c(., c("Sakai, Japan", "Sakai, Osaka, Japan"))) %>% unlist()
  kExcludeKumamotoMedCtr <- "Kumamoto Med Ctr, " %>% str_c(kDept) %>%
    map( ~ str_c(., c("Kumamoto, Japan"))) %>% unlist()
  kExcludeKureMedCtr <- "Kure Med Ctr, " %>% str_c(kDept) %>%
    map( ~ str_c(., c("Kure, Japan", "Hiroshima, Japan"))) %>% unlist()
  kExcludeKyushuCancCtr <- "Kyushu Canc Ctr, " %>% str_c(kDept) %>%
    map( ~ str_c(., c("Fukuoka, Japan"))) %>% unlist()
  kExcludeKyushuMedCtr <- "Kyushu Med Ctr, " %>% str_c(kDept) %>%
    map( ~ str_c(., c("Fukuoka, Japan"))) %>% unlist()
  kExcludeMieChuoMedCtr <- "Mie Chuo Med Ctr, " %>% str_c(kDept) %>%
    map( ~ str_c(., c("Tsu, Japan", "Tsu, Mie, Japan"))) %>% unlist()
  kExcludeMiyakonojoMedCtr <- "Miyakonojo Med Ctr, " %>% str_c(kDept) %>%
    map( ~ str_c(., c("Miyakonojo 8808510, Japan"))) %>% unlist()
  kExcludeMurayamaMedCtr <- "Murayama Med Ctr, " %>% str_c(kDept) %>%
    map( ~ str_c(., c("Musashimurayama, Japan", "Musashimurayama, Tokyo, Japan", "Tokyo, Japan"))) %>% unlist()
  kExcludeNagaraMedCtr <- "Nagara Med Ctr, " %>% str_c(kDept) %>%
    map( ~ str_c(., c("1300-7 Nagara, Gifu, Japan", "Gifu, Japan", "Tokyo, Japan"))) %>% unlist()
  kExcludeNagasakiKawatanaMedCtr <- "Nagasaki Kawatana Med Ctr, " %>% str_c(kDept) %>%
    map( ~ str_c(., c("Kawatana, Japan", "Nagasaki, Japan"))) %>% unlist()
  kExcludeNagasakiNatlHosp <- "Nagasaki Natl Hosp, " %>% str_c(kDept) %>%
    map( ~ str_c(., c("Nagasaki, Japan"))) %>% unlist()
  kExcludeNagoyaMedCtr <- "Nagoya Med Ctr, " %>% str_c(kDept) %>%
    map( ~ str_c(., c("Nagoya, Japan", "Nagoya, Aichi, Japan"))) %>% unlist()
  kExcludeNatlDisasterMedCtr <- "Natl Disaster Med Ctr, " %>% str_c(kDept) %>%
    map( ~ str_c(., c("3256 Midoricho Tachikawa, Tokyo, Japan", "Tokyo, Japan", "Tachikawa, Tokyo, Japan"))) %>% unlist()
  kExcludeNatlSaitamaHosp <- "Natl Saitama Hosp, Wako, " %>% str_c(kDept) %>%
    map( ~ str_c(., c("Saitama, Japan"))) %>% unlist()
  kExcludeNishiniigataChuoHosp <- "Nishiniigata Chuo Hosp, " %>% str_c(kDept) %>%
    map( ~ str_c(., c("Niigata, Japan"))) %>% unlist()
  kExcludeNiigataNatlHosp <- "Niigata Natl Hosp, " %>% str_c(kDept) %>%
    map( ~ str_c(., c("Kashiwazaki, Niigata 9450847, Japan"))) %>% unlist()
  kExcludeNishisaitamaChuoNatlHosp <- "Nishisaitama Chuo Natl Hosp, " %>% str_c(kDept) %>%
    map( ~ str_c(., c("Saitama, Japan", "Tokorozawa, Saitama, Japan"))) %>% unlist()
  kExcludeOkayamaMedCtr <- "Okayama Med Ctr, " %>% str_c(kDept) %>%
    map( ~ str_c(., c("Okayama, Japan"))) %>% unlist()
  kExcludeOsakaMinamiMedCtr <- "Osaka Minami Med Ctr, " %>% str_c(kDept) %>%
    map( ~ str_c(., c("Osaka, Japan"))) %>% unlist()
  kExcludeOsakaNatlHosp <- "Osaka Natl Hosp, " %>% str_c(kDept) %>%
    map( ~ str_c(., c("Osaka, Japan"))) %>% unlist()
  kExcludeOsakaToneyamaMedCtr <- "Osaka Toneyama Med Ctr, " %>% str_c(kDept) %>%
    map( ~ str_c(., c("Toyonaka, Osaka, Japan", "Osaka, Japan"))) %>% unlist()
  kExcludeSagamiharaNatlHosp <- "Sagamihara Natl Hosp, " %>% str_c(kDept) %>%
    map( ~ str_c(., c("Sagamihara, Kanagawa, Japan", "Kanagawa, Japan", "Sagamihara, Japan"))) %>% unlist()
  kExcludeSendaiNishitagaHosp <- "Sendai Nishitaga Hosp, " %>% str_c(kDept) %>%
    map( ~ str_c(., c("Miyagi, Japan", "Sendai, Japan", "Sendai, Miyagi, Japan"))) %>% unlist()
  kExcludeShikokuCancCtr <- "Shikoku Canc Ctr, " %>% str_c(kDept) %>%
    map( ~ str_c(., c("Matsuyama, Ehime, Japan", "Matsuyama, Japan"))) %>% unlist()
  kExcludeShikokuMedCtr <- "Shikoku Med Ctr Children & Adults, " %>% str_c(kDept) %>%
    map( ~ str_c(., c("Zentsuji, Japan", "Kagawa, Japan", "Zentsuji, Kagawa, Japan"))) %>% unlist()
  kExcludeShimoshizuNatlHosp <- "Shimoshizu Natl Hosp, " %>% str_c(kDept) %>%
    map( ~ str_c(., c("Yotsukaido, Japan"))) %>% unlist()
  kExcludeShizuokaMedCtr <- "Shizuoka Med Ctr, " %>% str_c(kDept) %>%
    map( ~ str_c(., c("Shimizu, Japan", "Shizuoka, Japan", "Shimizu, Shizuoka, Japan", "Shimizu, Sunto Shizuoka, Japan"))) %>% unlist()
  kExcludeShizuokaInstEpilepsy <- "Shizuoka Inst Epilepsy & Neurol Disorders, " %>% str_c(kDept) %>%
    map( ~ str_c(., c("Shizuoka, Japan"))) %>% unlist()
  kExcludeTakasakiGenMedCtr <- "Takasaki Gen Med Ctr, " %>% str_c(kDept) %>%
    map( ~ str_c(., c("Takasaki, Gumma, Japan", "Gunma, Japan", "Takasaki, Japan"))) %>% unlist()
  kExcludeTokyoMedCtr <- "Tokyo Med Ctr, " %>% str_c(kDept) %>%
    map( ~ str_c(., c("Tokyo, Japan"))) %>% unlist()
  kExcludeToyohashiMedCtr <- "Toyohashi Med Ctr, " %>% str_c(kDept) %>%
    map( ~ str_c(., c("Toyohashi, Aichi, Japan", "Toyohashi, Japan"))) %>% unlist()
  kExcludeUreshinoMedCtr <- "Ureshino Med Ctr, " %>% str_c(kDept) %>%
    map( ~ str_c(., c("Ureshino, Japan", "Ureshino, Saga, Japan", "Saga, Japan"))) %>% unlist()
  kExcludeUtanoNatlHosp <- "Utano Natl Hosp, " %>% str_c(kDept) %>%
    map( ~ str_c(., c("Kyoto, Japan"))) %>% unlist()
  kExcludeYonagoMedCtr <- "Yonago Med Ctr, " %>% str_c(kDept) %>%
    map( ~ str_c(., c("Yonago, Tottori, Japan", "Tottori, Japan", "Yonago, Japan"))) %>% unlist()

  kExcludeTextList <<- c(kExcludeAomoriNatlHosp,
                         kExcludeAsaihkawaMedCtr,
                         kExcludeBeppuMedCtr,
                         kExcludeFukushimaNatlHosp,
                         kExcludeFukuokaHigashiMedCtr,
                         kExcludeFukuokaNatlHosp,
                         kExcludeFukuyamaMedCtr,
                         kExcludeHakodateNatlHosp,
                         kExcludeHigashinagoyaNatlHosp,
                         kExcludeHigashisaitamaNatlHosp,
                         kExcludeHigashiHiroshimaMedCtr,
                         kExcludeHigashihiroshimaMedCtr,
                         kExcludeHigashiOhmiGenMedCtr,
                         kExcludeHiroshimaNishiMedCtr,
                         kExcludeHirosakiNatlHosp,
                         kExcludeHokkaidoCancCtr,
                         kExcludeHokurikuNatlHosp,
                         kExcludeIwakuniClinCtr,
                         kExcludeKanazawaMedCtr,
                         kExcludeKanmonMedCtr,
                         kExcludeKasumigauraMedCtr,
                         kExcludeKinkiChuoChestMedCtr,
                         kExcludeKureMedCtr,
                         kExcludeKumamotoMedCtr,
                         kExcludeKyushuCancCtr,
                         kExcludeKyushuMedCtr,
                         kExcludeMieChuoMedCtr,
                         kExcludeMiyakonojoMedCtr,
                         kExcludeMurayamaMedCtr,
                         kExcludeNagaraMedCtr,
                         kExcludeNagasakiKawatanaMedCtr,
                         kExcludeNagasakiNatlHosp,
                         kExcludeNagoyaMedCtr,
                         kExcludeNatlDisasterMedCtr,
                         kExcludeNatlSaitamaHosp,
                         kExcludeNiigataNatlHosp,
                         kExcludeNishiniigataChuoHosp,
                         kExcludeNishisaitamaChuoNatlHosp,
                         kExcludeOkayamaMedCtr,
                         kExcludeOsakaMinamiMedCtr,
                         kExcludeOsakaNatlHosp,
                         kExcludeOsakaToneyamaMedCtr,
                         kExcludeSagamiharaNatlHosp,
                         kExcludeSendaiNishitagaHosp,
                         kExcludeShikokuCancCtr,
                         kExcludeShikokuMedCtr,
                         kExcludeShimoshizuNatlHosp,
                         kExcludeShizuokaInstEpilepsy,
                         kExcludeShizuokaMedCtr,
                         kExcludeTakasakiGenMedCtr,
                         kExcludeTokyoMedCtr,
                         kExcludeToyohashiMedCtr,
                         kExcludeUtanoNatlHosp,
                         kExcludeUreshinoMedCtr,
                         kExcludeYonagoMedCtr,
                         "Clin Res Ctr, Murayama Med Ctr, Musashimurayama, Japan",
                         "Kure Med Ctr, Chugoku Canc Ctr, Dept Anesthesiol, Hiroshima, Japan",
                         "Mito Med Ctr, Dept Radiol, Higashiibaraki, Ibaraki, Japan",
                         "Mito Med Ctr, Dept Orthoped Surg, Ibarakimachi, Japan",
                         "Nat Hosp Org, Nagoya Med Ctr, Nagoya, Aichi, Japan",
                         "Natl Hlth Org Hamada Med Ctr, Dept Anesthesiol, Hamada, Qatar",
                         "Natl Kyushu Canc Ctr, Dept Head & Neck Surg, Fukuoka, Japan",
                         "Natl Mie Hosp, Inst Clin Res, Tsu, Mie, Japan",
                         "Natl Org Hosp, Kokura Med Ctr, Dept Internal Med, Div Resp Med, Kitakyushu, Fukuoka, Japan",
                         "Natl Tokyo Med Ctr, Dept Med, Div Rheumatol, Tokyo, Japan",
                         "Natl Tokyo Med Ctr, Natl Inst Sensory Organs, Tokyo, Japan",
                         "Toneyama Med Ctr, Osaka, Japan",
                         "Sagamihara Natl Hosp, Clin Res Ctr Allergy & Rheumatol, Sagamihara, Spain",
                         "Shikoku Med Ctr Children & Adults Kagawa, Dept Neurosurg, Zentsuji, Japan",
                         "Shikoku Med Ctr Children & Adults, Dept Neonatol, Zentsuj, Japan",
                         "Shikoku Canc Ctr Hosp, Dept Gastroenterol Surg, Matsuyama, Japan",
                         "Shizuoka Inst Epilepsy & Neurol Disorder, Natl Epilepsy Ctr, Shizuoka, Japan",
                         "Yonago Med Ctr, Dept Cardiol, Torrori, Japan")
})
CheckAd <- function(target_list_uid_and_address_spec){
  check_nho_ad <- target_list_uid_and_address_spec |> map( ~ {
    filename_uid_address <- .
    address <- filename_uid_address$address_spec
    for (i in 1:length(address)) {
      ad <- address[[i]]$full_address
      if (str_detect(ad, kNhoString[1]) |
          str_detect(ad, kNhoString[2]) |
          str_detect(ad, kNhoString[3]) |
          str_detect(ad, kNhoString[4])){
        address <- NULL
        break
      }
      for (j in 1:length(check_ad_hosp_name_list)) {
        if (str_detect(ad, check_ad_hosp_name_list[j])) {
          temp <- data.frame(uid=filename_uid_address$uid, ad=ad)
          check_ad_hosp_list <<- check_ad_hosp_list %>% bind_rows(temp)
          address <- NULL
          break
        }
      }
      if (is.null(address)) {
        return(NULL)
      }
    }
    if (is.null(address)) {
      return(NULL)
    }
    return(filename_uid_address)
  }) %>% keep( ~ !is.null(.))
  return(check_nho_ad)
}
CheckAd2 <- function(check_ad_hosp_list) {
  # NHO, Natl hosp orgの記載がないNHO病院を抽出
  # 該当施設の郵便番号を含んでいたらチェック対象外
  for (row in 1:nrow(check_ad_hosp_list)) {
    for (i in 1:length(kPostalCode)) {
      if (str_detect(check_ad_hosp_list[row, "ad"], kPostalCode[i])) {
        check_ad_hosp_list[row, "ad"] <- NA
        break
      }
    }
  }
  check_ad_hosp_list <- check_ad_hosp_list %>% filter(!is.na(ad))
  # 施設情報完全一致もチェック対象外
  for (row in 1:nrow(check_ad_hosp_list)) {
    for (i in 1:length(kExcludeTextList)) {
      if (str_detect(check_ad_hosp_list[row, "ad"], kExcludeTextList[i])) {
        check_ad_hosp_list[row, "ad"] <- NA
        break
      }
    }
  }
  check_ad_hosp_list <- check_ad_hosp_list %>% filter(!is.na(ad))
  # チェック済wos-idを除外
  for (row in 1:nrow(check_ad_hosp_list)) {
    for (i in 1:length(checked_uid_list)) {
      if (check_ad_hosp_list[row, "uid"] == checked_uid_list[i]) {
        check_ad_hosp_list[row, "ad"] <- NA
        break
      }
    }
  }
  res <- check_ad_hosp_list %>% left_join(html_uids, by="uid") %>% arrange(filename)
  return(res)
}
