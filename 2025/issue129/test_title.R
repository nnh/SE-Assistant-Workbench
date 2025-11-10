# "title",
title_target <- input_json$sheets
title_fieldItems <- title_target %>% map( ~ {
    sheet <- .x
    jpname <- sheet$name
    alias_name <- sheet$alias_name
    field_items <- sheet$field_items %>% map( ~ {
        field_item <- .x
        if (field_item$type != "FieldItem::Heading") {
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
if (length(title_fieldItems) > 0) {
    title_result <- bind_rows(title_fieldItems)
    write_csv(title_result, "/Users/mariko/Library/CloudStorage/Box-Box/Datacenter/Users/ohtsuka/2025/20251107/AML224-FLT3-ITD_title.csv")
} else {
    print("title 0件")
}

