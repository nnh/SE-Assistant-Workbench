kExcludeHospNameList <- c("(?i)Red Cross",
                          "(?i)univ",
                          "(?i)Rosai Hosp",
                          "(?i)Police Hosp",
                          "(?i)Kousei Hosp, ",
                          "(?i)Co Ltd, ",
                          "(?i)Prefectural ",
                          "(?i)Prefecture ",
                          "(?i)Saiseikai ",
                          "(?i)Med Sch, ",
                          "(?i)Med Coll",
                          "(?i)Coll Med, ",
                          "(?i)Municipal ",
                          "(?i)Citizen ",
                          "(?i)City ",
                          "(?i)Kohseiren ",
                          "(?i)Koseikan, ",
                          "(?i)Metropolitan ",
                          "(?i)Tokushukai ",
                          "(?i) Assoc, ",
                          "(?i) Clin, ",
                          "(?i) Ekisaikai ",
                          "(?i) Inc, ",
                          "(?i) KK, ",
                          "(?i)Japan Community Healthcare Org, ",
                          "(?i)Japan Community Hlth Care Org",
                          "(?i)Genbaku Hosp",
                          " JR ",
                          "JR ",
                          "(?i)Jougasaki Hosp",
                          "(?i)Toya Hosp, ",
                          "(?i)Mitsui Omuta Hosp, ",
                          "5 Shinanomachi,Shinjyuku Ku, Tokyo, Japan",
                          "(?i)Japanese Fdn Canc Res, ",
                          "(?i)Bell Land Gen Hosp, ",
                          "(?i)NTT Med Ctr ",
                          "(?i)Towa Hosp, ",
                          "(?i)Muta Hosp, ",
                          "(?i)Japan Reference Measurement Inst, ",
                          "(?i)Fukujuji Hosp, ",
                          "(?i)Nagayama Rheumatol & Orthopaed Clin, ",
                          "(?i)Matsuda Hosp, ",
                          "(?i)Tohoku Cent Hosp, ",
                          "(?i)Shonan Kamakura Gen Hosp, ",
                          "(?i)Japanese Org Study Ossificat Spinal Ligament JOSL, ",
                          "(?i)Ota Mem Hosp",
                          "(?i)Hamamatsu Med Photon Fdn, ",
                          "(?i)Sakurabashi Watanabe Hosp, ",
                          "(?i)Teine Keijinkai Hosp, ",
                          "(?i)Natl Canc Ctr, ",
                          "(?i)Osaka Gen Med Ctr, ",
                          "(?i)Hamamatsu Kita Hosp, ",
                          "(?i)Miyagi Canc Ctr, ",
                          "(?i)Kanagawa Canc Ctr, ",
                          "(?i)Saitama Canc Ctr, ",
                          "(?i)Aichi Canc Ctr ",
                          "(?i)Sendai Orthopaed Hosp, ",
                          "(?i)Kobe Childrens Hosp, ",
                          "(?i)Osaka Womens & Childrens Hosp, ",
                          "(?i)Natl Ctr Child Hlth & Dev, ",
                          "(?i)Gunma Childrens Med Ctr, ",
                          "(?i)Osaka Habikino Med Ctr, ",
                          "(?i)Natl Canc Ctr Hosp East, ",
                          "(?i)Tochigi Canc Ctr, ",
                          "(?i)Chiba Canc Ctr, ",
                          "(?i)Shizuoka Canc Ctr ",
                          "(?i)Toyoda Eisei Hosp, ",
                          "(?i)Natl Cerebral & Cardiovasc Ctr, ",
                          "(?i)Sanno Med Ctr, ",
                          "(?i)Urasoe Gen Hosp, ",
                          "(?i)Obihiro Kosei Gen Hosp, ",
                          "(?i)Sendai Open Hosp, ",
                          "(?i)Natl Ctr Global Hlth & Med, ",
                          "(?i)Kitano Hosp, ",
                          "(?i)Tokyo Shinagawa Hosp, ",
                          "(?i)Toranomon Gen Hosp, ",
                          "(?i)Shuto Gen Hosp, ",
                          "(?i)Kohnodai Hosp, ",
                          "(?i)Onomichi Gen Hosp, ",
                          "(?i)Osaka Int Canc Inst, ",
                          "(?i)Tsuyama Chuo Hosp, ",
                          "(?i)Kurashiki Cent Hosp, ",
                          "(?i)Kariya Toyota Gen Hosp, ",
                          "(?i)Vihara Hananosato Hosp, ",
                          "(?i)Geriatr Res Inst & Hosp, ",
                          "(?i)Kyoto Katsura Hosp, ",
                          "(?i)Kanagawa Cardiovasc & Resp Ctr, ",
                          "(?i)Hlth Insurance Kumamoto Gen Hosp, ",
                          "(?i)Shin Beppu Hosp, ",
                          "(?i)Amakusa Med Ctr, ",
                          "(?i)Aso Med Ctr, ",
                          "(?i)Tamana Cent Hosp, ",
                          "(?i)Imakiire Gen Hosp, ",
                          "(?i)Japanese Org Study Ossi fi cat Spinal Ligament ",
                          "(?i)Lateral Epicondylitis Clin Practice Guidelines ",
                          "(?i)Shonan Cent Hosp, ",
                          "(?i)Ogikubo Hosp, ",
                          "(?i)Fukuoka Sanno Hosp, ",
                          "(?i)Kikkoman Gen Hosp, ",
                          "(?i)Komazawa Hosp, ",
                          "(?i)Ichikawa Gen Hosp, ",
                          "(?i)Tachikawa Hosp, ",
                          "(?i)Japan Sci & Technol Agcy JST, ",
                          "(?i)Saga Ken Med Ctr Koseikan, ",
                          "(?i)Kinashi Obayashi Hosp, ",
                          "(?i)Mitoyo Gen Hosp, ",
                          "(?i)Fujisawa Childrens Clin, ",
                          "(?i)Showa Gen Hosp, ",
                          "(?i)Southern TOHOKU Proton Therapy Ctr, ",
                          "(?i)KKR Sapporo Med Ctr, ",
                          "(?i)Kinki Cent Hosp, ",
                          "(?i)Natl Cerebral & Cardiovasc Ctr Res Inst, ",
                          "(?i)Sanno Hosp, ",
                          "(?i)Fukuoka Childrens Hosp, ",
                          "(?i)Chiba Cardiovasc Ctr, ",
                          "(?i)Childrens Med Ctr, Haebaru, ",
                          "(?i)Aichi Childrens Hlth & Med Ctr, ",
                          "(?i)Amagasaki Cent Hosp, ",
                          "(?i)Shiga Med Ctr, ",
                          "(?i)Shiga Gen Hosp, ",
                          "(?i)Atom Bomb Survivors Hosp, ",
                          "(?i)Miyazaki Med Ctr Hosp, ",
                          "(?i)Real life Practice Experts HCC RELPEC Study Grp, ",
                          "Sapporo Hosp, Dept Orthopaed Surg, North 24,East 1, Sapporo, Hokkaido 0650024, Japan",
                          "(?i)Doai Mem Hosp, ",
                          "(?i)Kawaguchikogyo Gen Hosp, ",
                          "(?i)AOI Hachioji Hosp, ",
                          "Cardiovasc Inst, Tokyo, Japan",
                          "(?i)Minami Hachi Hosp, ",
                          "(?i)Tokyo Rinkai Hosp, ",
                          "(?i)Niigata Canc Ctr Hosp, ",
                          "(?i)Harasanshin Hosp, ",
                          "(?i)Kudanzaka Hosp, ",
                          "(?i)Tsukuba Mem Hosp, ",
                          "(?i)Tsuchiura Kyodo Gen Hosp, ",
                          "(?i)Mitsui Mem Hosp, ",
                          "(?i)Tosei Gen Hosp, ",
                          "(?i)Kyoto Min Iren Asukai Hosp, ",
                          "(?i)Japanese Soc Cardiovasc Surg, ",
                          "(?i)Hirakata Kohsai Hosp, ",
                          "(?i)Kansai Elect Power Hosp, ",
                          "(?i)Nishikobe Med Ctr, ",
                          "(?i)Koto Mem Hosp, ",
                          "(?i)Mitsubishi Kyoto Hosp, ",
                          "(?i)Tenri Hosp, ",
                          "(?i)Kokura Mem Hosp, ",
                          "(?i)Kohnan Hosp, ",
                          "(?i)Kiryu Kosei Gen Hosp, ",
                          "(?i)Kusunoki Hosp, ",
                          "(?i)Shin Yurigaoka Gen Hosp, ",
                          "(?i)Fukushima Preservat Serv Assoc Hlth, ",
                          "(?i)Kitakyushu Koga Hosp, ",
                          "(?i)Mishuku Hosp, ",
                          "(?i)Kinan Hosp, ",
                          "(?i)Sakakibara Heart Inst, ",
                          "(?i)Natl Def Med Coll")
# ------ functions ------
getNonOutput <- function(){
  list_uid_doctype <- rec |> map( ~ GetDoctype(.)) %>% list_flatten()
  # raw.jsonからHTMLに出力されていないuidを抽出する
  non_output_uids <- list_uid_doctype %>% map( ~ {
    temp <- filter(html_uids, uid == .$uid)
    if (nrow(temp) == 0) {
      return(.)
    } else {
      return(NULL)
    }
  }) %>% keep( ~ !is.null(.))
  check_non_output_uids <- non_output_uids %>% map( ~ {
    uid <- .$uid
    doctype <- .$doctype
    for (i in 1:length(list_uid_and_address_spec)) {
      if (list_uid_and_address_spec[[i]]$uid == uid) {
        address_spec <- list_uid_and_address_spec[[i]]$address_spec %>%
          map_if( ~ .$country != "Japan", function(x) NULL) %>% keep( ~ !is.null(.))
        address_spec <- address_spec %>% map( ~ {
          address <- .
          for (j in 1:length(kExcludeHospNameList)){
            if (str_detect(address$full_address, kExcludeHospNameList[j])) {
              address <- NULL
              break
            }
          }
          return(address)
        }) %>% keep( ~ !is.null(.))
        break
      }
    }
    sortdate <- NA
    for (i in 1:length(all_papers_json)) {
      if (all_papers_json[[i]]$uid == uid) {
        sortdate <- all_papers_json[[i]]$sortDate
        break
      }
    }
    return(list(uid=uid, address_spec=address_spec, doctype=doctype, sortdate=sortdate))
  }) %>% keep( ~ !is.na(.$sortdate))
  return(check_non_output_uids)
}
# ------ main ------
test <- check_non_output_uids %>% map( ~ .$address_spec %>% map( ~ .$full_address)) %>% unlist()
test2 <- data.frame(x=test)
write.table(test2, here("test.txt"), row.names = F)
