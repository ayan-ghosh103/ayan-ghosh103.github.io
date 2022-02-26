---
layout: post
title: "PySpark Analysis Expedia"
date: 2021-05-23
---


[Github_Repo](https://github.com/ayan-ghosh103/Spark-Analysis.git)

# PySpark Analysis on the Expedia Dataset
Use PySpark Environment to do various analysis using Spark SQL and Dataframe API, also focusing on Graph Analysis.

## Background of the dataset
Expedia provided this dataset; in hope the analysts build a viable and sustainable model to predict and provide their millions of customer base with personalized recommendations to boost their market share in the travel industry segment.

Normally, during the time when this dataset was released, Expedia uses search parameters to adjust their hotel recommendations, but there are not enough customer specific data to personalize them for each user. In this competition, Expedia expected the analysts to contextualize customer data and predict the likelihood a customer chooses a personalized recommendation provided by Expedia, with 100 different hotel clusters to choose from.

[Dataset_Link](https://www.kaggle.com/c/expedia-hotel-recommendations/data)

## Goal of the Analysis
In this project I will only be considering profiling analysis and finding out the trends between various attributes within Spark Environment, and this project will not be focusing on building a model to predict hotel clusters – thus only thet training data was taken for the analysis, consisting of customer preferences and search patterns, including the details whether they finally booked or not, the period was mainly from the year 2013 and 2014.

The training set consists of 37,670,293 entries. Apart from this, the dataset also provides some latent features for each of the destinations recorded in the train data sets. The data is anonymized and almost all the fields are in numeric format. Missing data, ranking requirement, and the curse of dimensionality are the main challenges posed by this dataset, the report focuses on finding trends between different attributes to
find the driving factors within this dataset helping to find customer clusters and finally build a classification model (out of scope of this project).

## Analysis deep dive
The project analysis will be focusing on profiling users, their search characteristics, user location analysis. It will help to understand the customers better, understand how they are distributed geographically, the time when customers are most active and destination profiling. The dataset is analyzed at the beginning, looking into the basic statistics, null values within columns and the datatypes for each column, those which will be dealt with as the analysis proceeds.

[Video_Explanation](https://drive.google.com/file/d/1L42wepjZfFKKEbS9pVgUViS6wGSZp9hL/view?usp=sharing)
