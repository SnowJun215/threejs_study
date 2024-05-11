import  {useEffect, useRef} from 'react';
import presenter from "./create";

import './index.css';

const Index = () => {
  const el = useRef<any>();

  useEffect(() => {
    console.log('Index');

    if (el.current) return;
    el.current = presenter.init();
  }, []);
  return (
    <>
      <div className="result-box-outer">
        <dialog className="result-box">
          <h2 className="result-box-title">
            <span>恭</span>
            <span>喜</span>
            <span>过</span>
            <span>关</span>
          </h2>
          <button className="btn btn-close">✖️</button>
          <dl className="result-info"></dl>
          <p>
            <button className="btn btn-primary js-next-level">挑战更高难度</button>
            <strong className="btn-primary js-all-complete">已完成所有难度的挑战！</strong>
          </p>
        </dialog>
      </div>
    </>
  );
};

export default Index;
