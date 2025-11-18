library(tidyverse)
library(jsonlite)
rm(list = ls())
input_path <- "/Users/mariko/Library/CloudStorage/Box-Box/Datacenter/ISR/Ptosh/検証/JSON/AML224-FLT3-ITD_250929_1501.json"
input_json <- jsonlite::read_json(input_path)
# "presence",
presence_target <- input_json$sheets
presence_fieldItems <- presence_target %>% map( ~ {
    sheet <- .x
    jpname <- sheet$name
    alias_name <- sheet$alias_name
    field_items <- sheet$field_items %>% map( ~ {
        field_item <- .x
        if (field_item$type != "FieldItem::Article") {
            return(NULL)
        }
        validators <- if ("validators" %in% names(field_item)) field_item$validators else NULL
        if (is.null(validators)) {
            return(NULL)
        }
        presence <- if ("presence" %in% names(validators)) validators$presence else NULL
        if (!is.null(presence)) {
            return(NULL)
        }
        res <- list(jpname = jpname, alias_name = alias_name, field_item_name = field_item$name, field_item_label = field_item$label)
        return(res)
    }) %>% discard( ~ is.null(.x) )
    if (length(field_items) == 0) {
        return(NULL)
    }
    return(field_items)
}) %>% discard( ~ is.null(.x) )
if (length(presence_fieldItems) > 0) {
    presence_result <- bind_rows(presence_fieldItems)
    # ieorres, xxstatを除外
    ie <- presence_target %>% map( ~ {
      alias_name <- .$alias_name
      cdisc_sheet_configs <-.$cdisc_sheet_configs %>% keep( ~ .x$prefix == "IE")
        if (length(cdisc_sheet_configs) == 0) {
          return(NULL)
        }
        ieorres <- cdisc_sheet_configs$table #%>% keep( ~ .x == "ORRES")
        if (length(ieorres) == 0) {
          return(NULL)
        }
        return(list(alias_name = alias_name, ieorres = ieorres))
      })
    write_csv(presence_result, "/Users/mariko/Library/CloudStorage/Box-Box/Datacenter/Users/ohtsuka/2025/20251107/AML224-FLT3-ITD_presence.csv")
} else {
    print("presence 0件")
}
