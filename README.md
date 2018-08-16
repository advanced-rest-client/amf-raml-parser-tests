A node module to test differences between RAML JS parser and AMF parser.

Any difference exposed by this tester may potentially break the experience as
both models should have the same mount of information.

## Running tests

Step 1:

```
$ npm i && bower i
```

Step 2:

Put the APIs to analyze in the `apis/` folder. Each API to be a zip file containing the API.

Step 3:

```
$ node run-tests.js
```

It prints report in the terminal when finished.

Results are saved in `report.json` file. This file can be read by loading  `index.html` file in a web server.


## Command options

```
$ node run-tests.js --ci --sample 1 --dir "test/"
```

**--ci**

When set it will try to guess what the main file of the API is. If not used it
will ask each time when can't determine the API.


**--sample [number]**

Set sample size. Value from 0 to 100. An option `--sample 2` sets the sample size to
2% of all apis in the `apis/` directory.


**--dir [string]**
The location of the APIs.
