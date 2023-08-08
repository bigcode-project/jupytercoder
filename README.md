# Jupyter Coder
Jupyter Coder is a jupyter plugin based on [Starcoder](https://github.com/bigcode-project/starcoder)
Starcoder has its unique capacity to leverage the jupyter notebook structure to produce code under instruction. This plugin enable you to use starcoder in your notebook.

## Key features
### code completition
In a cell, press "ctrl + space" to trigger 
![image](https://github.com/bigcode-project/jupytercoder/assets/6381544/14331c44-59b9-4a86-9f75-1238f3da4854)

Press "ctrl" to accpet the proposition.

### Bug fix
In a cell with error message, press "ctrl + `" to trigger the bug fix mode
![image](https://github.com/bigcode-project/jupytercoder/assets/6381544/f2c630b7-c767-40a9-96de-78b766a29a93)

Press ctrl to accept

## Load extension for Firefox (Development)

### Requirement
- Node version 18+
  
### Install
- Clone this repository

- ```npm install -g web-ext```

- ```web-ext run```

- Check "Always allow on localhost" on the Firefox this extension page



## Install the chrome extension
https://chrome.google.com/webstore/detail/jupyter-coder/kbedojkmlknhepcaggkdimefcbiifkjf

## Installation from github (skip if you install from chrome store)
```bash
git clone https://github.com/bigcode-project/jupytercoder.git
```

Open chrome://extensions/ in your browser and enable developer mode.
![devmode](https://user-images.githubusercontent.com/6381544/236060575-1fbb4024-165d-491f-8ae6-450c50b7a66d.png)

Then click on "Load unpacked" and select the folder where you cloned this repository.
![unpack](https://user-images.githubusercontent.com/6381544/236060695-c432a612-bfeb-4708-909a-f1bb8a64f732.png)

## Add API key
Then click on the extension icon to enable it, you will need to enter the bigcode model endpoint url https://api-inference.huggingface.co/models/bigcode/starcoderbase/ and your hf readonlys api key. Click save to activate this mode.
![image](https://user-images.githubusercontent.com/6381544/236060887-5c7fd3b1-d5f7-4b86-8282-8925ed867825.png)

## Demo
```bash
cd examples
jupyter notebook
```

In case you encounter issue, you might want to install the same jupyter notebook version
```bash
jupyter notebook --version
>>> 6.5.2
```

Open the notebook sklearn_digits.ipynb and try it out.
Type ctrl+space to trigger the code completion when you are in a code cell, then ctrl to accept it (welcome your thought on the key binding!).
