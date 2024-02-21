#' title
#' description
#' @file crc-nnh-go-jp-migration.R
#' @author Mariko Ohtsuka
#' @date YYYY.MM.DD
rm(list=ls())
# ------ libraries ------
library(tidyverse)
library(here)
library(rvest)
# ------ constants ------
kInputPath <- "/Users/mariko/Downloads/test20240216"
# ------ functions ------
GetTargetContent <- function(element, target_content) {
  element_class <- element |> html_attr("class")
  if (is.na(element_class)){
    return(NULL)
  }
  if (element_class == target_content){
    tag_a <- element |> html_nodes("a") |> map_df( ~ {
      content <- .
      img_src <- content |> html_nodes("img") %>% html_attr("src")
      img <- ifelse(length(img_src) == 0, "", img_src)
      url <- content |> html_attr("href")
      rel <- content |> html_attr("rel")
      text <- ifelse(is.null(rel) | is.na(rel) | rel == "NA", html_text(content), rel)
      res <- c(url=url, text=text, img=img)
      return(res)
    })
    return(tag_a)
  }
  return(NULL)
}
GetTargetContents <- function(elements, target_content) {
  res <- elements |> map( ~ GetTargetContent(., target_content)) %>% keep( ~ !is.null(.))
  return(res)
}
GetTagForm <- function(html) {

}
GetTagDiv <- function(input_path) {
  html <- input_path |> read_html()
  # <div>要素を取得する
  div_elements <- html_nodes(html, "div")
  target_class <- c("link_nmc",
                    "link_home",
                    "langBtn",
                    "menu-main_menu-container",
                    "site-content",
                    "site-title left",
                    "widget widget_nav_menu")
  res <- data.frame()
  for (class_count in 1:length(target_class)) {
    target <- target_class[class_count]
    temp <- div_elements |> GetTargetContents(target)
    if (length(temp) > 0) {
      temp2 <- data.frame()
      for (i in 1:length(temp)) {
        temp2 <- bind_rows(temp2, temp[[i]])
      }
      temp2$target <- target
      temp2$input_path <- input_path
      res <- bind_rows(res, temp2)
    }
  }
  return(res)
}

ReadHtml <- function(input_path){
  tag_div <- input_path |> GetTagDiv()
  return(tag_div)
}
# ------ main ------
filelist_html <- kInputPath |> list.files(pattern = "*.html", full.names=T, recursive=T)
index <- grep("/wp-json/", filelist_html)
filelist_html <- filelist_html[-index]
filenames <- filelist_html |> str_remove(str_c(kInputPath, "/")) %>% str_replace_all("/", "_")
files <- filelist_html %>% map_df( ~ ReadHtml(.))
#names(files) <- filenames
