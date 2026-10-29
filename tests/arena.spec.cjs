const { test, expect } = require('@playwright/test');
test('3D arena, six visible racers, race and gifts', async ({ page }, testInfo) => {
  const errors=[];
  page.on('pageerror', error=>errors.push(error.message));
  await page.goto('/', {waitUntil:'domcontentloaded'});
  await expect(page.locator('#stage canvas')).toBeVisible({timeout:25000});
  await page.waitForFunction(()=>window.__turboDiagnostics?.racers?.length===6, {timeout:25000});
  const diag=await page.evaluate(()=>{
    const d=window.__turboDiagnostics,{THREE,camera,renderer,racers}=d;
    camera.updateMatrixWorld(true);
    const rect=renderer.domElement.getBoundingClientRect();
    const bounds=racers.map(r=>{
      r.root.updateMatrixWorld(true);
      const center=new THREE.Vector3();new THREE.Box3().setFromObject(r.root).getCenter(center);
      const projected=center.clone().project(camera);
      return {name:r.name,visible:r.root.visible,screenX:(projected.x+1)/2,screenY:(1-projected.y)/2,depth:projected.z};
    });
    const gl=renderer.getContext();
    return {bounds,canvas:{width:rect.width,height:rect.height},webglError:gl.getError(),message:document.querySelector('#message').textContent};
  });
  await testInfo.attach('3d-diagnostics.json',{body:JSON.stringify({diag,errors},null,2),contentType:'application/json'});
  await page.screenshot({path:testInfo.outputPath('arena.png'),fullPage:true});
  expect(errors,'JavaScript errors').toEqual([]);
  expect(diag.webglError,'WebGL error').toBe(0);
  expect(diag.canvas.width).toBeGreaterThan(600);
  expect(diag.bounds).toHaveLength(6);
  for(const r of diag.bounds){
    expect(r.visible,r.name+' hidden').toBe(true);
    expect(r.screenX,r.name+' outside horizontally').toBeGreaterThan(.02);
    expect(r.screenX,r.name+' outside horizontally').toBeLessThan(.98);
    expect(r.screenY,r.name+' outside vertically').toBeGreaterThan(.02);
    expect(r.screenY,r.name+' outside vertically').toBeLessThan(.98);
    expect(r.depth,r.name+' behind camera').toBeGreaterThan(-1);
    expect(r.depth,r.name+' beyond camera').toBeLessThan(1);
  }
  await page.locator('#viewer').fill('Test İzleyici');
  await page.locator('#gift').selectOption('10');
  await page.locator('#send').click();
  await expect(page.locator('#support0')).toContainText('Test İzleyici');
  await page.locator('#start').click();
  await expect(page.locator('#message')).toContainText('Yarış başladı');
  await page.waitForTimeout(1200);
  const score=await page.evaluate(()=>window.__turboDiagnostics.racers[0].score);
  expect(score).toBeGreaterThan(0);
});
