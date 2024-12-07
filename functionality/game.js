let follower = document.getElementById('carrier');
let is_clicked = false;

follower.addEventListener('mousedown', function(){
    is_clicked = true;

});

document.addEventListener('mouseup', function(){
    is_clicked = false;
});

document.addEventListener('mousemove', function(e){
    //if (is_clicked) {
    follower.style.position = 'absolute';
    follower.style.top = (e.clientY - follower.clientHeight/2) + 'px';
    follower.style.left = (e.clientX - follower.clientWidth/2) + 'px';
    //}
});