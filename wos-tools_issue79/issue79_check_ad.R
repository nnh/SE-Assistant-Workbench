hosp_list <- list()
hosp_list$shizuoka_med_ctr <- list()
hosp_list$mie_natl_hosp <- list()
hosp_list$kure_med_ctr <- list()
hosp_list$hiroshima_nishi_med_ctr <- list()
hosp_list$shikoku_med_ctr <- list()
hosp_list$disaster_med_ctr <- list()
hosp_list$ureshino_med_ctr <- list()
hosp_list$asahikawa_med_ctr <- list()
hosp_list$shimoshizu_natl_hosp <- list()
hosp_list$kumamoto_med_ctr <- list()
hosp_list$yonago_med_ctr <- list()
hosp_list$nishitaga_hosp <- list()
hosp_list$shikoku_canc_ctr <- list()
hosp_list$mie_chuo_med_ctr <- list()
hosp_list$iwakuni_med_ctr <- list()
hosp_list$takasaki_gen_med_ctr <- list()
hosp_list$hokkaido_canc_ctr <- list()
hosp_list$nagoya_med_ctr <- list()
hosp_list$kinki_chuo_chest_med_ctr <- list()
hosp_list$okayama_med_ctr <- list()
hosp_list$nishisaitama_chuo_natl_hosp <- list()
hosp_list$murayama_med_ctr <- list()
hosp_list$kyushu_canc_ctr <- list()
hosp_list$beppu_med_ctr <- list()
hosp_list$Kanmon_med_ctr <- list()
hosp_list$niigata_natl_hosp <- list()
hosp_list$kyushu_med_ctr <- list()
hosp_list$nagasaki_kawatana_med_ctr <- list()
hosp_list$toyohashi_med_ctr <- list()
hosp_list$kasumigaura_med_ctr <- list()
hosp_list$osaka_natl_hosp <- list()
hosp_list$fukuoka_higashi_med_ctr <- list()
hosp_list$nagasaki_natl_hosp <- list()
hosp_list$tokyo_med_ctr <- list()
hosp_list$hakodate_natl_hosp <- list()
hosp_list$toneyama_med_ctr <- list()
hosp_list$kokura_med_ctr <- list()
hosp_list$sagamihara_natl_hosp <- list()
hosp_list$nishiniigata_chuo_hosp <- list()
hosp_list$utano_natl_hosp <- list()
hosp_list$oita_med_ctr <- list()
hosp_list$higashihiroshima_med_ctr <- list()
hosp_list$yamaguchi_ube_med_ctr <- list()
hosp_list$fukuyama_med_ctr <- list()
hosp_list$aomori_natl_hosp <- list()
hosp_list$hokuriku_natl_hosp <- list()
hosp_list$nagara_med_ctr <- list()
hosp_list$higashisaitama_natl_hosp <- list()
hosp_list$osaka_minami_med_ctr <- list()
hosp_list$shizuoka_inst_epilepsy <- list()
hosp_list$tenryu_hosp <- list()
hosp_list$ehime_med_ctr <- list()
hosp_list$kanazawa_med_ctr <- list()
hosp_list$higashi_ohmi_gen_med_ctr <- list()
hosp_list$hirosaki_natl_hosp <- list()
hosp_list$natl_saitama_hosp <- list()
hosp_list$higashinagoya_natl_hosp <- list()
hosp_list$miyakonojo_med_ctr <- list()
hosp_list$fukushima_natl_hosp <- list()
hosp_list$hamada_med_ctr <- list()
hosp_list$fukuoka_natl_hosp <- list()
mito_med_ctr <- list()
nagasaki_hosp <- list()
CheckAd <- function(target_list_uid_and_address_spec){
  check_nho_ad <- target_list_uid_and_address_spec |> map( ~ {
    filename_uid_address <- .
    address <- filename_uid_address$address_spec
    for (i in 1:length(address)) {
      ad <- address[[i]]$full_address
      if (str_detect(ad, kNhoString[1]) | str_detect(ad, kNhoString[2]) | str_detect(ad, kNhoString[3])){
        address <- NULL
        break
      }
      if (str_detect(ad, "(?i)shizuoka med ctr")) {
        hosp_list$shizuoka_med_ctr <<- append(hosp_list$shizuoka_med_ctr, list(filename_uid_address))
        address <- NULL
        break
      }
      if (str_detect(ad, "(?i)mie natl hosp") | str_detect(ad, "(?i)natl mie hosp")) {
        hosp_list$mie_natl_hosp <<- append(hosp_list$mie_natl_hosp, list(filename_uid_address))
        address <- NULL
        break
      }
      if (str_detect(ad, "(?i)kure med ctr")) {
        hosp_list$kure_med_ctr <<- append(hosp_list$kure_med_ctr, list(filename_uid_address))
        address <- NULL
        break
      }
      if (str_detect(ad, "(?i)hiroshima nishi med ctr")) {
        hosp_list$hiroshima_nishi_med_ctr <<- append(hosp_list$hiroshima_nishi_med_ctr, list(filename_uid_address))
        address <- NULL
        break
      }
      if (str_detect(ad, "(?i)Shikoku Med Ctr Children & Adults")){
        hosp_list$shikoku_med_ctr <<- append(hosp_list$shikoku_med_ctr, list(filename_uid_address))
        address <- NULL
        break
      }
      if (str_detect(ad, "(?i)Disaster med ctr")){
        hosp_list$disaster_med_ctr <<- append(hosp_list$disaster_med_ctr, list(filename_uid_address))
        address <- NULL
        break
      }
      if (str_detect(ad, "(?i)ureshino med ctr")){
        hosp_list$ureshino_med_ctr <<- append(hosp_list$ureshino_med_ctr, list(filename_uid_address))
        address <- NULL
        break
      }
      if (str_detect(ad, "(?i)asahikawa med ctr")){
        hosp_list$asahikawa_med_ctr <<- append(hosp_list$asahikawa_med_ctr, list(filename_uid_address))
        address <- NULL
        break
      }
      if (str_detect(ad, "(?i)Shimoshizu natl hosp")){
        hosp_list$shimoshizu_natl_hosp <<- append(hosp_list$shimoshizu_natl_hosp, list(filename_uid_address))
        address <- NULL
        break
      }
      if (str_detect(ad, "(?i)kumamoto med ctr")){
        hosp_list$kumamoto_med_ctr <<- append(hosp_list$kumamoto_med_ctr, list(filename_uid_address))
        address <- NULL
        break
      }
      if (str_detect(ad, "(?i)yonago med ctr")){
        hosp_list$yonago_med_ctr <<- append(hosp_list$yonago_med_ctr, list(filename_uid_address))
        address <- NULL
        break
      }
      if (str_detect(ad, "(?i)Sendai Nishitaga hosp")){
        hosp_list$nishitaga_hosp <<- append(hosp_list$nishitaga_hosp, list(filename_uid_address))
        address <- NULL
        break
      }
      if (str_detect(ad, "(?i)Shikoku canc ctr")){
        hosp_list$shikoku_canc_ctr <<- append(hosp_list$shikoku_canc_ctr, list(filename_uid_address))
        address <- NULL
        break
      }
      if (str_detect(ad, "(?i)Mie Chuo med ctr")){
        hosp_list$mie_chuo_med_ctr <<- append(hosp_list$mie_chuo_med_ctr, list(filename_uid_address))
        address <- NULL
        break
      }
      if (str_detect(ad, "(?i)Iwakuni clin ctr")){
        hosp_list$iwakuni_med_ctr <<- append(hosp_list$iwakuni_med_ctr, list(filename_uid_address))
        address <- NULL
        break
      }
      if (str_detect(ad, "(?i)Takasaki gen med ctr")){
        hosp_list$takasaki_gen_med_ctr <<- append(hosp_list$takasaki_gen_med_ctr, list(filename_uid_address))
        address <- NULL
        break
      }
      if (str_detect(ad, "(?i)Hokkaido canc ctr")){
        hosp_list$hokkaido_canc_ctr <<- append(hosp_list$hokkaido_canc_ctr, list(filename_uid_address))
        address <- NULL
        break
      }
      if (str_detect(ad, "(?i)Nagoya med ctr")){
        hosp_list$nagoya_med_ctr <<- append(hosp_list$nagoya_med_ctr, list(filename_uid_address))
        address <- NULL
        break
      }
      if (str_detect(ad, "(?i)Kinki Chuo Chest med ctr")){
        hosp_list$kinki_chuo_chest_med_ctr <<- append(hosp_list$kinki_chuo_chest_med_ctr, list(filename_uid_address))
        address <- NULL
        break
      }
      if (str_detect(ad, "(?i)okayama med ctr")){
        hosp_list$okayama_med_ctr <<- append(hosp_list$okayama_med_ctr, list(filename_uid_address))
        address <- NULL
        break
      }
      if (str_detect(ad, "(?i)Nishisaitama Chuo natl hosp")){
        hosp_list$nishisaitama_chuo_natl_hosp <<- append(hosp_list$nishisaitama_chuo_natl_hosp, list(filename_uid_address))
        address <- NULL
        break
      }
      if (str_detect(ad, "(?i)murayama med ctr")){
        hosp_list$murayama_med_ctr <<- append(hosp_list$murayama_med_ctr, list(filename_uid_address))
        address <- NULL
        break
      }
      if (str_detect(ad, "(?i)Kyushu canc ctr")){
        hosp_list$kyushu_canc_ctr <<- append(hosp_list$kyushu_canc_ctr, list(filename_uid_address))
        address <- NULL
        break
      }
      if (str_detect(ad, "(?i)Beppu med ctr")){
        hosp_list$beppu_med_ctr <<- append(hosp_list$beppu_med_ctr, list(filename_uid_address))
        address <- NULL
        break
      }
      if (str_detect(ad, "(?i)Kanmon med ctr")){
        hosp_list$kanmon_med_ctr <<- append(hosp_list$kanmon_med_ctr, list(filename_uid_address))
        address <- NULL
        break
      }
      if (str_detect(ad, "(?i)Niigata natl hosp")){
        hosp_list$niigata_natl_hosp <<- append(hosp_list$niigata_natl_hosp, list(filename_uid_address))
        address <- NULL
        break
      }
      if (str_detect(ad, "(?i)kyushu med ctr")){
        hosp_list$kyushu_med_ctr <<- append(hosp_list$kyushu_med_ctr, list(filename_uid_address))
        address <- NULL
        break
      }
      if (str_detect(ad, "(?i)Nagasaki Kawatana med ctr")){
        hosp_list$nagasaki_kawatana_med_ctr <<- append(hosp_list$nagasaki_kawatana_med_ctr, list(filename_uid_address))
        address <- NULL
        break
      }
      if (str_detect(ad, "(?i)Toyohashi med ctr")){
        hosp_list$toyohashi_med_ctr <<- append(hosp_list$toyohashi_med_ctr, list(filename_uid_address))
        address <- NULL
        break
      }
      if (str_detect(ad, "(?i)Kasumigaura med ctr")){
        hosp_list$kasumigaura_med_ctr <<- append(hosp_list$kasumigaura_med_ctr, list(filename_uid_address))
        address <- NULL
        break
      }
      if (str_detect(ad, "(?i)Osaka natl hosp")){
        hosp_list$osaka_natl_hosp <<- append(hosp_list$osaka_natl_hosp, list(filename_uid_address))
        address <- NULL
        break
      }
      if (str_detect(ad, "(?i)Fukuoka higashi med ctr")){
        hosp_list$fukuoka_higashi_med_ctr <<- append(hosp_list$fukuoka_higashi_med_ctr, list(filename_uid_address))
        address <- NULL
        break
      }
      if (str_detect(ad, "(?i)Nagasaki natl hosp")){
        hosp_list$nagasaki_natl_hosp <<- append(hosp_list$nagasaki_natl_hosp, list(filename_uid_address))
        address <- NULL
        break
      }
      if (str_detect(ad, "(?i)Tokyo med ctr")){
        hosp_list$tokyo_med_ctr <<- append(hosp_list$tokyo_med_ctr, list(filename_uid_address))
        address <- NULL
        break
      }
      if (str_detect(ad, "(?i)Hakodate natl hosp")){
        hosp_list$hakodate_natl_hosp <<- append(hosp_list$hakodate_natl_hosp, list(filename_uid_address))
        address <- NULL
        break
      }
      if (str_detect(ad, "(?i)Toneyama med ctr")){
        hosp_list$toneyama_med_ctr <<- append(hosp_list$toneyama_med_ctr, list(filename_uid_address))
        address <- NULL
        break
      }
      if (str_detect(ad, "(?i)Kokura med ctr")){
        hosp_list$kokura_med_ctr <<- append(hosp_list$kokura_med_ctr, list(filename_uid_address))
        address <- NULL
        break
      }
      if (str_detect(ad, "(?i)Sagamihara natl hosp")){
        hosp_list$sagamihara_natl_hosp <<- append(hosp_list$sagamihara_natl_hosp, list(filename_uid_address))
        address <- NULL
        break
      }
      if (str_detect(ad, "(?i)Nishiniigata Chuo hosp")){
        hosp_list$nishiniigata_chuo_hosp <<- append(hosp_list$nishiniigata_chuo_hosp, list(filename_uid_address))
        address <- NULL
        break
      }
      if (str_detect(ad, "(?i)Utano natl hosp")){
        hosp_list$utano_natl_hosp <<- append(hosp_list$utano_natl_hosp, list(filename_uid_address))
        address <- NULL
        break
      }
      if (str_detect(ad, "(?i)Oita med ctr")){
        hosp_list$oita_med_ctr <<- append(hosp_list$oita_med_ctr, list(filename_uid_address))
        address <- NULL
        break
      }
      if (str_detect(ad, "(?i)Higashihiroshima med ctr") | str_detect(ad, "(?i)Higashi hiroshima med ctr")){
        hosp_list$higashihiroshima_med_ctr <<- append(hosp_list$higashihiroshima_med_ctr, list(filename_uid_address))
        address <- NULL
        break
      }
      if (str_detect(ad, "(?i)Yamaguchi Ube med ctr")){
        hosp_list$yamaguchi_ube_med_ctr <<- append(hosp_list$yamaguchi_ube_med_ctr, list(filename_uid_address))
        address <- NULL
        break
      }
      if (str_detect(ad, "(?i)Fukuyama med ctr")){
        hosp_list$fukuyama_med_ctr <<- append(hosp_list$fukuyama_med_ctr, list(filename_uid_address))
        address <- NULL
        break
      }
      if (str_detect(ad, "(?i)Aomori natl hosp")){
        hosp_list$aomori_natl_hosp <<- append(hosp_list$aomori_natl_hosp, list(filename_uid_address))
        address <- NULL
        break
      }
      if (str_detect(ad, "(?i)Hokuriku natl hosp")){
        hosp_list$hokuriku_natl_hosp <<- append(hosp_list$hokuriku_natl_hosp, list(filename_uid_address))
        address <- NULL
        break
      }
      if (str_detect(ad, "(?i)Nagara med ctr")){
        hosp_list$nagara_med_ctr <<- append(hosp_list$nagara_med_ctr, list(filename_uid_address))
        address <- NULL
        break
      }
      if (str_detect(ad, "(?i)Higashisaitama natl hosp")){
        hosp_list$higashisaitama_natl_hosp <<- append(hosp_list$higashisaitama_natl_hosp, list(filename_uid_address))
        address <- NULL
        break
      }
      if (str_detect(ad, "(?i)Osaka Minami med ctr")){
        hosp_list$osaka_minami_med_ctr <<- append(hosp_list$osaka_minami_med_ctr, list(filename_uid_address))
        address <- NULL
        break
      }
      if (str_detect(ad, "(?i)Shizuoka Inst Epilepsy")){
        hosp_list$shizuoka_inst_epilepsy <<- append(hosp_list$shizuoka_inst_epilepsy, list(filename_uid_address))
        address <- NULL
        break
      }
      if (str_detect(ad, "(?i)Tenryu hosp")){
        hosp_list$tenryu_hosp <<- append(hosp_list$tenryu_hosp, list(filename_uid_address))
        address <- NULL
        break
      }
      if (str_detect(ad, "(?i)Ehime med ctr")){
        hosp_list$ehime_med_ctr <<- append(hosp_list$ehime_med_ctr, list(filename_uid_address))
        address <- NULL
        break
      }
      if (str_detect(ad, "(?i)Kanazawa med ctr")){
        hosp_list$kanazawa_med_ctr <<- append(hosp_list$kanazawa_med_ctr, list(filename_uid_address))
        address <- NULL
        break
      }
      if (str_detect(ad, "(?i)Higashi Ohmi gen med ctr")){
        hosp_list$higashi_ohmi_gen_med_ctr <<- append(hosp_list$higashi_ohmi_gen_med_ctr, list(filename_uid_address))
        address <- NULL
        break
      }
      if (str_detect(ad, "(?i)Hirosaki natl hosp")){
        hosp_list$hirosaki_natl_hosp <<- append(hosp_list$hirosaki_natl_hosp, list(filename_uid_address))
        address <- NULL
        break
      }
      if (str_detect(ad, "(?i)Natl Saitama Hosp")){
        hosp_list$natl_saitama_hosp <<- append(hosp_list$natl_saitama_hosp, list(filename_uid_address))
        address <- NULL
        break
      }
      if (str_detect(ad, "(?i)Higashinagoya natl hosp")){
        hosp_list$higashinagoya_natl_hosp <<- append(hosp_list$higashinagoya_natl_hosp, list(filename_uid_address))
        address <- NULL
        break
      }
      if (str_detect(ad, "(?i)Miyakonojo med ctr")){
        hosp_list$miyakonojo_med_ctr <<- append(hosp_list$miyakonojo_med_ctr, list(filename_uid_address))
        address <- NULL
        break
      }
      if (str_detect(ad, "(?i)Fukushima natl hosp")){
        hosp_list$fukushima_natl_hosp <<- append(hosp_list$fukushima_natl_hosp, list(filename_uid_address))
        address <- NULL
        break
      }
      if (str_detect(ad, "(?i)Hamada med ctr")){
        hosp_list$hamada_med_ctr <<- append(hosp_list$hamada_med_ctr, list(filename_uid_address))
        address <- NULL
        break
      }
      if (str_detect(ad, "(?i)Fukuoka natl hosp")){
        hosp_list$fukuoka_natl_hosp <<- append(hosp_list$fukuoka_natl_hosp, list(filename_uid_address))
        address <- NULL
        break
      }

      if (str_detect(ad, "(?i)mito med ctr")){
        mito_med_ctr <<- append(mito_med_ctr, list(filename_uid_address))
        address <- NULL
        break
      }
      if (str_detect(ad, "(?i)nagasaki hosp")){
        nagasaki_hosp <<- append(nagasaki_hosp, list(filename_uid_address))
        address <- NULL
        break
      }
    }
    if (is.null(address)) {
      return(NULL)
    }
    return(filename_uid_address)
  }) %>% keep( ~ !is.null(.))
  return(check_nho_ad)
}
