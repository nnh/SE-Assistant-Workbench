GetVisitGroups <- function(input_json) {
    visit_groups <- input_json$visit_groups %>%
        map(~ {
            jpname <- .x$name
            alias_name <- .x$alias_name
            visit_sheets <- .x$visit_sheets %>% map(~ c(alias_name = .x$sheet_alias_name, group = alias_name, jpname = jpname))
            return(visit_sheets)
        }) %>%
        bind_rows()

    return(visit_groups)
}
JoinVisitGroups <- function(target, visit_groups) {
    res <- target %>%
        left_join(visit_groups, by = c("alias_name" = "alias_name")) %>%
        mutate(alias_name = ifelse(is.na(group), alias_name, group)) %>%
        select(-group)
    res$jpname <- ifelse(is.na(res$jpname.y), res$jpname.x, res$jpname.y)
    res <- res %>% select(-jpname.x, -jpname.y)
    res <- res %>% select(jpname, everything())
    return(res)
}
