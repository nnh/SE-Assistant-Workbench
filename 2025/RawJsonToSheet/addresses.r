# --- functions ---
get_names_names <- function(addresses) {
    if (addresses$count == 1) {
        address_names <- list(addresses$address_name)
    } else {
        address_names <- addresses$address_name
    }
    res <- address_names %>%
        map(~ {
            address_name <- .x
            names <- address_name$names
            if (is.null(names)) {
                return(NULL)
            }
            res <- get_names_name(names)
            return(res)
        }) %>%
        bind_rows()
}
get_names_name <- function(names) {
    if (is.null(names)) {
        return(NULL)
    }
    if (names$count == 1) {
        nameList <- list(names$name)
    } else {
        nameList <- names$name
    }
    res <- nameList %>%
        map(~ {
            name <- .x
            addr_no <- name$addr_no
            full_name <- name$full_name
            tibble(addr_no = addr_no, full_name = full_name)
        }) %>%
        bind_rows()
    return(res)
}
get_address_specs <- function(addresses) {
    if (addresses$count == 1) {
        address_names <- list(addresses$address_name)
    } else {
        address_names <- addresses$address_name
    }
    res <- address_names %>%
        map(~ {
            address_name <- .x
            address_spec <- address_name$address_spec
            if (is.null(address_spec)) {
                return(NULL)
            }
            res <- get_address_spec(address_spec)
            return(res)
        }) %>%
        bind_rows()
    return(res)
}
get_address_spec <- function(address_spec) {
    country <- address_spec$country
    addr_no <- address_spec$addr_no
    organizations <- address_spec$organizations
    organizations_df <- map_dfr(organizations$organization, ~ {
        tibble(
            organization = .x$content
        )
    })
    full_address <- address_spec$full_address
    address <- tibble(
        country = country,
        addr_no = addr_no,
        full_address = full_address
    )
    if (!is.null(organizations_df)) {
        address <- bind_cols(address, organizations_df)
    }
    res <- address %>% filter(country == "Japan")
    return(res)
}

exclude_institution <- function(df, institution_pattern) {
    df %>%
        filter(
            !str_detect(forcheck_ad, institution_pattern) &
                !str_detect(forcheck_oo, institution_pattern)
        )
}
get_unique_nho_not_in_html <- function(nho_not_in_html) {
    unique_nho_not_in_html <- nho_not_in_html %>%
        select(full_address, organization, uid) %>%
        distinct()
    return(unique_nho_not_in_html)
}
get_address_data <- function(rec) {
    address_data_list <- rec %>%
        map(~ {
            rec_list <- .x
            record_list <- rec_list %>%
                map(~ {
                    record <- .x
                    uid <- record$UID
                    static_data <- record$static_data
                    fullrecord_metadata <- static_data$fullrecord_metadata
                    addresses <- fullrecord_metadata$addresses
                    count <- addresses$count
                    names <- get_names_names(addresses)
                    address_specs <- get_address_specs(addresses)
                    if (is.null(address_specs)) {
                        return(NULL)
                    }
                    if (is.null(names)) {
                        names <- tibble(addr_no = address_specs$addr_no, full_name = NA)
                    }
                    res <- inner_join(address_specs, names, by = "addr_no", relationship = "many-to-many")
                    res$uid <- uid
                    return(res)
                }) %>%
                bind_rows()
            return(record_list)
        })
    address_data <- NULL
    for (i in seq_along(address_data_list)) {
        if (is.null(address_data_list[[i]])) {
            next
        }
        if (length(address_data_list[[i]]) == 0) {
            next
        }
        address_data <- bind_rows(address_data, address_data_list[[i]])
    }
    address_data$forcheck_ad <- str_to_lower(address_data$full_address)
    address_data$forcheck_oo <- str_to_lower(address_data$organization)
    return(address_data)
}
