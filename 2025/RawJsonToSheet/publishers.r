get_publish_data <- function(rec) {
    publish_data <- rec %>%
        map(~ {
            record <- .x
            record_list <- .x %>%
                map(~ {
                    uid <- .$UID
                    dynamic_data <- .$dynamic_data
                    cluster_related <- dynamic_data$cluster_related
                    identifiers <- cluster_related$identifiers$identifier
                    dynamic_data <- map_dfr(identifiers, as_tibble) %>%
                        group_by(type) %>%
                        summarise(value = paste(value, collapse = ", "), .groups = "drop") %>%
                        pivot_wider(names_from = type, values_from = value)
                    dynamic_data$UID <- uid
                    static_data <- .$static_data
                    summary <- static_data$summary
                    publishers <- summary$publishers$publisher$names$name %>% as_tibble()
                    publishers$UID <- uid
                    titles <- map_dfr(summary$titles$title, as_tibble) %>%
                        pivot_wider(names_from = type, values_from = content)
                    titles$UID <- uid
                    static_data <- inner_join(publishers, titles, by = "UID")
                    df <- inner_join(dynamic_data, static_data, by = "UID")
                    return(df)
                }) %>%
                bind_rows()
            return(record_list)
        }) %>%
        bind_rows()
    publish_data$pmid <- publish_data$pmid %>% str_remove_all("MEDLINE:")
    return(publish_data)
}
