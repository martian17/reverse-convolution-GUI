import {CSS, ELEM} from "htmlgen";
import {fft, ifft, convolveComplex} from "./convolution";
import {FlatFFT64 as FlatFFT} from "flat-fft";

export class App{
    constructor(container: HTMLElement){
        this.container = new ELEM(container);
        this.init();
    }
    add=(...args)=>this.container.add(...args)
    remove=(...args)=>this.container.remove(...args)
}

await new Promise(res=>setTimeout(res,1000));


type ComplexArray = Float64Array;

const toPolar = function(vals: ComplexArray){
    const res = new Float64Array(vals.length);
    for(let j = 0; j < vals.length; j += 2){
        const r = vals[j+0];
        const i = vals[j+1];
        res[j+0] = Math.sqrt(r*r+i*i);
        res[j+1] = Math.atan2(i,r);
    }
    return res;
};

//biggest non-subnormal number
//gotta love the precision
const omega = 1.1754943508222875e-38;
//const omega = 1.1754943508222875e-200;

const toPolar_v = function(r: number, i: number){
    return [
        Math.sqrt(r*r+i*i),
        Math.atan2(i,r)
    ];
};


const invertComplex = function(r: number, i: number){
    const d = Math.sqrt(r*r+i*i);
    if(d === 0)return [0,0];
    r /= d;
    i /= d;
    i = -i;
    return [r,i];
};

const reverseConvolution = function(input: ComplexArray, output: ComplexArray){
    //[output,input] = [input,output];
    //find the other input
    const ifreq = fft(input);
    const ofreq = fft(output);
    console.log(ifreq);
    console.log(ofreq);
    //ofreq/ifreq
    const res = new Float64Array(input.length);
    for(let j = 0; j < input.length; j += 2){
        // // complex division
        // const r1 = ofreq[j];
        // const i1 = ofreq[j+1];
        // const [r2,i2] = invertComplex(ifreq[j],ifreq[j+1]);
        // if(r2 === 0 && i2 === 0)console.log(j);
        // res[j] = r1*r2-i1*i2;
        // res[j+1] = r1*i2+r2*i1;


        // complex division
        const a = ofreq[j+0];
        const b = ofreq[j+1];
        const c = ifreq[j+0];
        const d = ifreq[j+1];
        const denom = c*c+d*d;
        if(denom === 0){
            console.log("adsfasdfa");
            res[j+0] = 0;
            res[j+1] = 0;
        }else{
            res[j+0] = (a*c+b*d)/denom;
            res[j+1] = (b*c-a*d)/denom;
        }
        // if(Math.abs(res[j+0]) === Infinity)console.log("infinity!!");
        // if(Math.abs(res[j+1]) === Infinity)console.log("infinity!!");
    }
    // console.log(res);
    // console.log(ifft(res));
    return ifft(res);
}

// const inverseTransform = function(input: ComplexArray, target: ComplexArray){
//     const r = reverseConvolution(fft(target),fft(input));
//     return toPolar(r);
// };

class NormalizedLinePlot extends ELEM{
    constructor(data = [1],ratio = 0.5){
        super("canvas",0,0,"display:block;width:100%;");
        this._ratio = ratio;
        this._data = data;
        this.canvas = this.e;
        this.ctx = this.canvas.getContext("2d");
        this.observer = new ResizeObserver(this.onResize.bind(this));
        this.observer.observe(this.e);
    }
    onResize(entries){
        const rect = entries[0].contentRect;
        this.e.width = rect.width;
        this.e.height = rect.width*this.ratio;
        this.render();
    }
    _ratio = 0.5;
    get ratio(){
        return this._ratio;
    }
    set ratio(ratio){
        this._ratio = ratio;
        this.onResize();
    }
    _data = [1];
    get data(){
        return this._data;
    }
    set data(data){
        this._data = data;
        this.render();
    }

    get width(){
        return this.canvas.width;
    }
    get height(){
        return this.canvas.height;
    }
    
    get em(){
        let r = this.width/20;
        if(r > 16)r = 16;
        return Math.round(r);
    }

    render(){
        const {canvas,ctx,data,width,height,em} = this;
        ctx.fillStyle = "#eee";
        ctx.textBaseline = 'middle';
        ctx.fillRect(0,0,width,height);
        let min = Infinity;
        let max = -Infinity;
        for(let val of data){
            if(val < min) min = val;
            if(val > max) max = val;
            if(isNaN(val))min = NaN;
        }
        if(isNaN(min)){
            ctx.fillStyle = "#fee";
            ctx.fillRect(0,0,width,height);

            ctx.fillStyle = "#000";
            ctx.font = `${em}px Arial`;
            ctx.textAlign = "center";
            ctx.fillText("Error: NaN found in the input value",width/2,height/2);
            return;
        }
        ctx.fillStyle = "#000";
        ctx.font = `${em}px Arial`;
        ctx.textAlign = "left";
        if(min === max){
            ctx.fillText(`${min}`,0,height/2);
            return;
        }
        const hmin = em;
        const hmax = height - em;
        ctx.beginPath();
        ctx.strokeStyle = "#00f"
        for(let i = 0; i < data.length; i++){
            const r = i/(data.length-1);
            const val = data[i];
            const hr = 1-(val-min)/(max-min);
            ctx.lineTo(width*r,hr*(hmax-hmin)+hmin);
        }
        ctx.stroke();
        ctx.fillStyle = "#0008";
        if(width/(data.length) > 6){
            for(let i = 0; i < data.length; i++){
                const r = i/(data.length-1);
                const val = data[i];
                const hr = 1-(val-min)/(max-min);
                ctx.beginPath();
                ctx.arc(width*r,hr*(hmax-hmin)+hmin,3,0,Math.PI*2);
                ctx.closePath();
                ctx.fill();
            }
        }
        ctx.fillStyle = "#000";
        ctx.fillText(`${min}`,em/2,hmax);
        ctx.fillText(`${max}`,em/2,hmin);
    }
}

const extractReal = function(arr: ComplexArray){
    let r = [];
    for(let i = 0; i < arr.length; i += 2){
        r.push(arr[i]);
    }
    return r;
};

const extractImaginary = function(arr: ComplexArray){
    let r = [];
    for(let i = 1; i < arr.length; i += 2){
        r.push(arr[i]);
    }
    return r;
};

const sawtoothTransform = function(arr: ComplexArray, target: ComplexArray){
    // convolve(fft(target), unknown) |> ifft === arr
    const af = fft(arr);
    const tf = fft(target);
    const unknown = reverseConvolution(tf,af);
    return unknown;
};

const inverseSawtoothTransform = function(farr: ComplexArray, target: ComplexArray){
    return ifft(convolveComplex(fft(target),farr));
};


App.prototype.init = async function(){
    const fwidth = 256;
    const degree = 8;

    let f0 = [];
    for(let i = 0; i < fwidth; i++){
        let r = ((i)%fwidth)/fwidth-0.5;
        r *= 10;
        f0.push(Math.E**(-r*r));

        // let val = 0;
        // if(i > fwidth*0.4 && i < fwidth*0.6)
        //     val = 1;
        // f0.push(val);
    }
    f0 = FlatFFT.toComplex(f0);

    let saw = [];
    for(let i = 0; i < fwidth; i++){
        let r = ((i+fwidth/2)%fwidth)/fwidth-0.5;
        saw.push(r);
    }
    saw = FlatFFT.toComplex(saw);
    let f1 = saw;
    // for(let i = 0; i < fwidth; i++){
    //     let r = ((i+fwidth/2)%fwidth)/fwidth-0.5;
    //     //let r = ((i)%fwidth)/fwidth-0.5;
    //     //r *= 10;
    //     //f1.push(Math.E**(-r*r));
    //     f1.push(r);
    // }
    // f1 = FlatFFT.toComplex(f1);

    this.add("h1",0,"Original input function");
    this.add(new NormalizedLinePlot(extractReal(f0)));
    this.add("h1",0,"Original kernel function");
    this.add(new NormalizedLinePlot(extractReal(f1)));
    const fr1 = fft(f1);
    this.add("h1",0,"Kernel Frequency domain (real)");
    this.add(new NormalizedLinePlot(extractReal(fr1)));
    this.add("h1",0,"Kernel Frequency domain (complex)");
    this.add(new NormalizedLinePlot(extractImaginary(fr1)));
    const fconv = convolveComplex(f0,f1);
    this.add("h1",0,"Convolved (real)");
    this.add(new NormalizedLinePlot(extractReal(fconv)));
    this.add("h1",0,"Convolved (imaginary)");
    this.add(new NormalizedLinePlot(extractImaginary(fconv)));


    // const f0__ = ifft(fr0);
    // this.add("h1",0,"ifft of freq domain (real)");
    // this.add(new NormalizedLinePlot(extractReal(f0__)));
    // this.add("h1",0,"ifft of freq domain (real)");
    // this.add(new NormalizedLinePlot(extractImaginary(f0__)));

    const f0_ = reverseConvolution(f1,fconv);
    this.add("h1",0,"Recovered input function (real)");
    this.add(new NormalizedLinePlot(extractReal(f0_)));
    this.add("h1",0,"Recovered input function (imaginary)");
    this.add(new NormalizedLinePlot(extractImaginary(f0_)));




    const sawFreq = new Float64Array(fwidth*2);
    sawFreq[0] = 0;
    sawFreq[2] = 1;
    const res = inverseSawtoothTransform(sawFreq,saw);
    this.add("h1",0,"Inverse sawtooth (real)");
    this.add(new NormalizedLinePlot(extractReal(res)));
    this.add("h1",0,"Inverse sawtooth (imaginary)");
    this.add(new NormalizedLinePlot(extractImaginary(res)));




    //this.add(new NormalizedLinePlot(new Array(1000).fill(0).map(v=>Math.random()-0.5)));
    //const _canvas = this.add("canvas");
    //const canvas = _canvas.e;
};



