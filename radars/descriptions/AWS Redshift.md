[AWS Redshift](https://aws.amazon.com/redshift/) is the world’s fastest cloud data warehouse and gets faster every year. For performance intensive workloads you can use the new RA3 instances to get up to 3x the performance of any cloud data warehouse.

Generally speaking Api Gateway is a cool technology but there is a strong preference to run appliations on our existing [Kubernetes]() clusters to take advantage of free resources that are already available. 

### Pros
* Managed
* Fast auto scaling
* Fast query responses
* Simple ETL from other AWS processes to Redshift

### Cons
* Very expensive
* Storage and compute historically not configurable separately (this is changing)

When decision made: 5/1/2020

When decision will be revisited: 5/1/2021

