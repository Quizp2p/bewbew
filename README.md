# Bewbew Attack Map

HanSight Animated Bewbew Attack Map v1.0

## Quick Start

### 使用Bower 安装
* 运行 `bower install bewbew --save`
* 在页面的html文件中引用：

````html
<script src="bower_components/d3/d3.min.js"></script>
<script src="bower_components/topojson/topojson.min.js"></script>
<script src="bower_components/jquery/dist/jquery.min.js"></script>
<script src="bower_components/datamaps/dist/datamaps.world.min.js"></script>
<script src="bower_components/moment/min/moment.min.js"></script>
<script src="bower_components/perfect-scrollbar/js/perfect-scrollbar.jquery.min.js"></script>
<script src="bower_components/elasticsearch/elasticsearch.jquery.js"></script>
<script src="bower_components/bewbew/js/d3.geo.projection.v0.min.js"></script>
<script src="bower_components/bewbew/js/bewbew.min.js"> </script>
````
* 加载默认的css样式:

`````html
<link rel="stylesheet" href="bower_components/perfect-scrollbar/css/perfect-scrollbar.min.css">
<link rel="stylesheet" href="bower_components/bewbew/css/bewbew.css">
`````
* 通过修改bewbew.css文件可以定制地图的外观和布局:

```css
#attack_container {
    background-color: black;
    overflow-y:hidden;
}

#attackdiv {
    font-family: monospace;
    font-size: 10px;
    position: fixed;
    height: 100px;
    width: 30%;
    color: white;
    background-color: black;
    padding: : 5px;
    margin-right: 30%;
    bottom: 0px;
    right: 0px;
    text-align: left;
    overflow-y: auto;
}

#container1 {
    position: relative;
    width: auto;
    height: 100%;

}

```

* 在页面中加入html元素:

````html
<div class="application" id="attack_container">

    <center>
        <div id="container1"></div>
    </center>
    <div id="attackdiv" class="perfect"></div>
</div>
````

* 在global scope中调用函数：

```javascript
var bewbewConfig = {
        demoMode: true,
        esWindowSize: 5
    };
    bewbew(bewbewConfig);
```

其中 `bewbewConfigs` 是地图的配置项：

````javascript
bewbewConfig.demoMode = true; //开启Demo模式，地图将循环固定时间段里的数据播放动画
bewbewConfig.lastTimestamp = '2016-01-01T00:00:00+08:00'; //Demo模式下固定时间段的起始点
bewbewConfig.bufferSize = 30; //渲染攻击的buffer 大小
bewbewConfig.esWindowSize = 100; //每次查询ES的Size
bewbewConfig.animateRefreshTime = 1; //动画的刷新间隔时间
bewbewConfig.esRefreshTime = 5; //查询ES的间隔时间
bewbewConfig.indexPattern = 'saas_*';
bewbewConfig.attackField = 'analysis'; //存储攻击的Field

// 攻击信息里的颜色
bewbewConfig.attackDivColors = {
    text_color: '#4ec2d1',
    alert_color: '#f0f6f6',
    ip_color: '#a4429e'
}

//定义不同攻击类型的表现颜色
bewbewConfig.attackColors = {
    'cybercrime': '#f26060',
    'blocklist_de_ssh': '#33e0f1',
    'FileIncludeAttack ': '#f98206',
    'stopforumspam_90d': '#bee248',
    'FileAccess ': '#16f228'
};

//攻击地图里的颜色
bewbewConfig.mapColors = {
    fill_color: 'black',
    border_color: '#4393c3',
    highlight_fill_color: 'gray',
    highlight_border_color: 'rgba(250, 15, 160, 0.2)',
    hoverinfo_text: '#72cd3c',
    hoverinfo_bg: '#393649'
};

//数据中心的经纬度坐标
bewbewConfig.dcLocation = {
    lat: '39.03',
    lon: '117.68'
};
````

## Elastic Search 中的数据

可以参考`response.json`中elasticsearch返回的查询结果：

````json
{
    "sc_win32_substatus": "0",
    "@@uid": "netbinhai27anquanyia04",
    "s_ip": {
        "host": "192.168.1.143"
    },
    "s_port": "81",
    "@timestamp": "2016-04-26T02:16:33.000Z",
    "cs_User_Agent": "Mozilla/5.0+(Linux;+U;+Android+4.4.2;+zh-cn;+GT-I9500+Build/KOT49H)+AppleWebKit/537.36+(KHTML,+like+Gecko)Version/4.0+MQQBrowser/5.0+QQ-URL-Manager+Mobile+Safari/537.36",
    "sc_status": "200",
    "cs_method": "GET",
    "analysis": "cybercrime",
    "sc_substatus": "0",
    "cs_uri_stem": "/lib/js/common.js",
    "time_taken": "21561",
    "c_ip": {
        "regionl0": "\u4e2d\u56fd",
        "regionl1": "\u4e0a\u6d77",
        "regionl2": "\u4e0a\u6d77",
        "ip": "101.226.33.228",
        "host": "101.226.33.228",
        "location": {
            "lat": "31.224349",
            "lon": "121.4767528"
        }
    }
}
````

在给出的示例数据中攻击地图会找出所有包含 `analysis` field条目，然后会取该field中的值作为攻击类型;
根据`@timestamp`生成攻击的时间序列；
攻击来源地国家，地区，ip分别会读取 `c_ip.regionl0` ， `c_ip.regionl1`, `c_ip.ip` ;
攻击在地图上的起始地址会根据 `c_ip.location` 中的经纬度坐标来确定.
