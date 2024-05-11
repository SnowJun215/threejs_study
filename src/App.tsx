import React, {useEffect} from 'react';
import './App.css';
import ThreeDModels from './components/3DModels';
import Cube from "./components/Cube";
import Example1 from './components/Example1';
import Lines from "./components/Lines";
import Text from "./components/Text";
import Test1 from "./components/Test1/index";

const App = React.memo(() => {
  useEffect(() => {
    console.log('App mounted')
  }, []);
  return <Test1 />;
})

export default App;
