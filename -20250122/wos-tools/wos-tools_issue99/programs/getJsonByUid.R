for (i in 1:length(rec)){
  rec_group <- rec[[i]]
  for (j in 1:length(rec_group)){
    rec_record <- rec_group[[j]]
    if (rec_record$UID == "WOS:000994980800001"){
      break
    } else {
      rec_record <- NULL
    }
  }
  if (!is.null(rec_record)){
    break
  }
}
target_json <- rec_record %>% toJSON()
target_json %>% str_detect(regex("(?i)CLINICAL"))
target_json %>% str_detect(regex("(?i)MEDICINE"))
write_json(target_json, here("output", "test.json"))
