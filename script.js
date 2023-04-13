(() => {
    // imgSize : cover || contain

    class CanvasFrame {
        constructor(value) {
            this.canvas = document.querySelector(value.canvas);
            this.ctx = this.canvas.getContext('2d');
            this.target = document.querySelector(value.aniTarget); // 애니메이션이 움직일 영역

            this.frames = [];
            this.urls = [];
            this.imgNumStart = value.imgNumStart || 1;
            this.imgCount = value.imgCount; // 이미지 총 개수
            this.imgCountDigit = value.imgCountDigit || 1; // 이미지 숫자 자릿수, 000이면 3, 0000이면 4
            this.imgRoute = value.imgRoute; // 이미지 경로
            this.imgName = value.imgName || ''; // 숫자를 제외한 이미지 이름
            this.imgFormat = value.imgFormat || 'jpg'; // 이미지 포맷 유형
            this.imgSize = value.imgSize || 'auto'; // background-size: cover || contain || auto
            this.originX = value.originX || 'center'; // background-position-x : left || center || right
            this.originY = value.originY || 'center'; // background-position-y : top || center || bottom
            
            this.targetOffsetTop = this.target.offsetTop; // 애니메이션이 움직일 영역의 위치값
            this.viewPortStart = value.viewPortStart || 1; // top || center || bottom || 0 ~ 1 // 화면기준 어느 부분부터 시작할지
            this.scrollStartPoint = value.scrollStartPoint || 0; // 0 ~ 1
            this.scrollEndPoint = value.scrollEndPoint || 1; // 0 ~ 1
            this.scrollStart = this.target.clientHeight * this.scrollStartPoint + this.targetOffsetTop; // 문서기준으로 애니메이션 시작할 위치
            this.scrollEnd = this.target.clientHeight * this.scrollEndPoint + this.targetOffsetTop; // 문서기준으로 애니메이션 끝날 위치
            this.scrollHeight = this.scrollEnd - this.scrollStart; // 애니메이션이 실행될 실제 높이

            this.baseSize = 0;
            this.baseRatio = 0;
            this.resizeWidth = 0;
            this.resizeHeight = 0;
            this.xPos = 0;
            this.yPos = 0;

            this.isReqStart = false;
            this.delay = 0;
            this.acc = 0.1;

            this.initImageSet();
            
            // resize Event
            window.addEventListener('resize', () => this.init());
            // scroll Event
            window.addEventListener('scroll', () => {

                if(!this.isReqStart) { // requestAnimationFrame 중복 막기
                    this.isReqStart = true;
                    this.refId = window.requestAnimationFrame(() => this.accCalc());
                }

            })
        }

        // load resize 될때마다 실행
        init() {
            this.viewWidth = document.documentElement.clientWidth;
            this.viewHeight = document.documentElement.clientHeight;

            this.canvas.width = this.viewWidth;
            this.canvas.height = this.viewHeight;

            this.viewPortCalc();
            this.sizeCalc();
        }

        
        imageUrlSet() {
            for(let i = 0; i < this.imgCount; i++) {
                const imgNum = i + this.imgNumStart;
                const zeroFill = this.imgCountDigit - String(imgNum).length;
                const zeroFillConvert = (zeroFill > 0) ? new Array(zeroFill).fill(0) : new Array;
                zeroFillConvert.push(imgNum);
                const url = `${this.imgRoute}${this.imgName}${zeroFillConvert.join('')}.${this.imgFormat}`;
                this.urls.push(url);
            }
        }

        // 이미지 초기 세팅(최초 한번만 실행됨.)
        async initImageSet() {
            this.imageUrlSet();
            const promises = this.urls.map((url) => {
                return new Promise((resolve, reject) => {
                    const img = new Image();

                    img.src = url;
                    console.log('1');
                    img.onload = () => {
                        console.log('2');
                        resolve(img);
                    };
                    img.onerror = () => reject(`images failed to load: ${url}`);
                });
            })
            this.frames = await Promise.all(promises);
            this.init();
        }

        viewPortCalc() {
            const viewport = window.innerHeight;

            if(typeof(this.viewPortStart) === 'string') {
                switch(this.viewPortStart) {
                    case 'top':
                        this.viewPortVal = viewport * 0;
                        break;
                    case 'center':
                        this.viewPortVal = viewport * 0.5;
                        break;
                    case 'bottom':
                        this.viewPortVal = viewport * 1;
                        break;
                }
            } else if(typeof(this.viewPortStart) === 'number') {
                this.viewPortVal = viewport * this.viewPortStart;
            }

        }

        // 이미지 사이즈에 따른 각각의 값 계산
        sizeCalc() {
            const compareImg = this.frames[0];

            switch(this.imgSize){
                case 'cover':
                    // 윈도우 사이즈와 img 사이즈 비교
                    if((this.viewWidth === compareImg.width) && (this.viewHeight === compareImg.height)) return;

                    // 이미지의 가로, 세로 비교하여 작은 사이즈를 기준으로 잡음
                    this.baseSize = compareImg.width > compareImg.height ? compareImg.height : compareImg.width;

                    // 윈도우 사이즈와 이미지 사이즈의 비율 구함
                    this.baseRatio = this.baseSize === compareImg.width ? (this.viewWidth / compareImg.width) : (this.viewHeight / compareImg.height);

                    // 비율만큼 곱하기
                    this.resizeWidth = compareImg.width * this.baseRatio;
                    this.resizeHeight = compareImg.height * this.baseRatio;

                    break;

                case 'contain':
                    // 윈도우 사이즈와 img의 비율을 가로 세로 각각 계산후 저장
                    const ratioW = this.viewWidth / compareImg.width;
                    const ratioH = this.viewHeight / compareImg.height;

                    // 이미지의 가로 세로에 각각 비율을 곱했을때 윈도우 사이즈를 
                    this.baseRatio = (ratioW * compareImg.height > this.viewHeight) ? ratioH : ratioW;

                    // 비율만큼 곱하기
                    this.resizeWidth = compareImg.width * this.baseRatio;
                    this.resizeHeight = compareImg.height * this.baseRatio;

                    break;
                default: // auto
                    this.resizeWidth = compareImg.width;
                    this.resizeHeight = compareImg.height;
            }

            //x, y 값 재정의
            this.posXCalc();
            this.posYCalc();
            // 현재 위치에 맞게 프레임 그려주기.
            this.accCalc();
        }

        posXCalc() {
            switch(this.originX) {
                case 'left':
                    this.xPos = 0;
                    break;
                case 'right':
                    this.xPos = this.viewWidth - this.resizeWidth;
                    break;
                case 'center':
                    this.xPos = this.viewWidth / 2 - this.resizeWidth / 2;
                    break;
            }
        }
        posYCalc() {
            switch(this.originY) {
                case 'top':
                    this.yPos = 0;
                    break;
                case 'bottom':
                    this.yPos = this.viewHeight - this.resizeHeight;
                    break;
                case 'center':
                    this.yPos = this.viewHeight / 2 - this.resizeHeight / 2;
                    break;
            }
        }

        // 이미지 그리기
        imgDraw(num) {
            if(!this.frames[num]) return;
            this.ctx.clearRect(0, 0, this.viewWidth, this.viewHeight);
            this.ctx.drawImage(this.frames[num], this.xPos, this.yPos, this.resizeWidth, this.resizeHeight);

        }

        // 가속도
        accCalc() {
            this.st = window.pageYOffset + this.viewPortVal; // 현재 스크롤 위치 + 애니메이션 시작 위치
            this.scrollCurrent = ((this.st - this.scrollStart) >= 0) ? (this.st - this.scrollStart) : 0; // 애니메이션이 실제로 실행될 위치 안에서 스크롤값. 이걸 기준으로 비율을 계산함. -값이라면 0으로 초기화

            if(this.st > this.scrollStart && this.scrollEnd > this.st) { // 해당 영역일때
                this.scrollRatio = Math.abs(this.scrollCurrent) / this.scrollHeight; // 애니메이션이 움직일 영역내에서 스크롤이 얼마나 움직였는지 비율 계산
                this.scrollImgCount = Math.round(this.imgCount * this.scrollRatio); // 이미지 갯수에 스크롤 비율만큼 곱함.

            } else if(this.st < this.scrollStart) { // 해당 영역의 시작점보다 위로 갈때
                this.scrollImgCount = 0;
            } else if(this.st > this.scrollEnd) { // 해당 영역의 끝점보다 밑으로 갈때
                this.scrollImgCount = this.imgCount;
            }

            if(this.scrollImgCount === undefined) {
                this.scrollImgCount = 0;
            }
            
            // 부드러운 느낌을 내기 위해 가속도 계산
            this.delay = this.delay + (this.scrollImgCount - this.delay) * this.acc;

            // 이미지 그려주기
            this.imgDraw(Math.round(this.delay));

            this.refId = window.requestAnimationFrame(() => this.accCalc());
        }

    }

    const frameEle = new CanvasFrame({
        canvas: '#canvas',
        aniTarget: '.sec1',
        viewPortStart: 'center',
        scrollStartPoint: 0.1,
        scrollEndPoint: 0.9,
        imgSize: 'contain',
        imgCount: 496,
        imgRoute: './frames/jpg/',
        imgFormat: 'jpg',
    })

    const frameEle2 = new CanvasFrame({
        canvas: '#canvas2',
        aniTarget: '.sec2',
        viewPortStart: 'bottom',
        scrollStartPoint: 0,
        scrollEndPoint: 1,
        imgSize: 'contain',
        imgCount: 223,
        imgCountDigit: 4,
        imgRoute: './frames2/jpg/',
        imgFormat: 'jpg',
    })

})()