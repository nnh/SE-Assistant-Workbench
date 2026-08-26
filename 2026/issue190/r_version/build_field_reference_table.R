library(tidyverse)

# field_items内のtype=="FieldItem::Reference"な要素を(alias_name, field_name, reference_type, reference_field)の
# tibbleにする。このフィールドは自分の値を持たず、reference_field(同じシート内の別フィールド)の値をそのまま使う
build_field_reference_table <- function(sheets) {
  sheets %>%
    map_dfr(function(sheet) {
      field_items <- sheet[["field_items"]]
      if (length(field_items) == 0) {
        return(tibble())
      }
      reference_table <- field_items %>%
        keep(~ identical(.x[["type"]], "FieldItem::Reference")) %>%
        map_dfr(~ tibble(
          field_name = .x[["name"]],
          reference_type = .x[["reference_type"]],
          reference_field = .x[["reference_field"]]
        ))

      if (nrow(reference_table) == 0) {
        return(reference_table)
      }
      reference_table %>% mutate(alias_name = sheet[["alias_name"]], .before = 1)
    })
}
