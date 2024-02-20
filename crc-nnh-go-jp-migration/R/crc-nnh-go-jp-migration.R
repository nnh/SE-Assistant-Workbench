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
    tag_a <- element |> html_nodes("a") |> map( ~ {
      content <- .
      url <- content |> html_attr("href")
      rel <- content |> html_attr("rel")
      text <- ifelse(is.null(rel) | is.na(rel) | rel == "NA", html_text(content), rel)
      res <-list(url=url, text=text)
      return(res)
    })
    kImgTag <- "img"
    tag_img <- element |> html_nodes(kImgTag) %>% html_attr("src")
    if (length(tag_a) == 0) {
      tag_a <- list(url="", text="")
    }
    if (length(tag_img) == 0) {
      tag_img <- ""
    }
    res <- c(unlist(tag_a), list(img=tag_img))
    return(res)
  }
  return(NULL)
}
GetTargetContents <- function(elements, target_content) {
  res <- elements |> map( ~ GetTargetContent(., target_content)) %>% keep( ~ !is.null(.))
  return(res)
}
GetTagForm <- function(html) {

}
GetTagDiv <- function(html) {
  # <div>要素を取得する
  div_elements <- html_nodes(html, "div")
  target_class <- c("link_nmc",
                    "link_home",
                    "langBtn",
                    "menu-main_menu-container",
                    "site-content",
                    "site-title left",
                    "widget widget_nav_menu")
  res <- target_class |> map( ~ {
    target <- .
    res <- div_elements |> GetTargetContents(target)
    return(res)
  })
  names(res) <- target_class
  return(res)

}

ReadHtml <- function(input_path){
  html <- input_path |> read_html()
  tag_div <- html |> GetTagDiv()
  return(tag_div)
}
# ------ main ------
filelist_html <- kInputPath |> list.files(pattern = "*.html", full.names=T, recursive=T)
index <- grep("/wp-json/", filelist_html)
filelist_html <- filelist_html[-index]
filenames <- filelist_html |> str_remove(str_c(kInputPath, "/")) %>% str_replace_all("/", "_")
files <- filelist_html %>% map( ~ ReadHtml(.))
names(files) <- filenames
