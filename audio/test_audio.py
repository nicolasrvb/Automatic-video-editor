import unittest
import numpy as np
from duration import fit,join
from mixing import mix

class AudioTests(unittest.TestCase):
    def setUp(self):
        self.sr=8000;t=np.arange(40*self.sr)/self.sr
        self.y=np.column_stack([np.sin(t*2*np.pi*220),np.sin(t*2*np.pi*220)]).astype(np.float32)*.2
        self.f={'bpm':120,'duration':40,'points':[{'time':i*.5,'beat':i,'chroma':[1,0],'timbre':[1,0],'rms':.2} for i in range(80)]}
    def test_shorten_and_extend(self):
        for target in [20,39.5,60]:
            out,r=fit(self.y,self.sr,self.f,target)
            self.assertLess(abs(len(out)/self.sr-target),.03)
            self.assertEqual(r['segments'][0]['start'],0)
            self.assertEqual(r['segments'][-1]['end'],40)
            self.assertTrue(np.isfinite(out).all())
    def test_no_silent_fallback(self):
        with self.assertRaises(ValueError):fit(self.y,self.sr,{**self.f,'points':[]},10)
    def test_correlated_join_does_not_boost(self):
        y=np.ones((1000,2),dtype=np.float32)*.4
        self.assertLessEqual(np.max(join(y,y,100)),.400001)
    def test_mix_modes(self):
        for mode in ['sequential','parallel']:
            out,r=mix(self.y,self.y,self.sr,self.f,self.f,{'mode':mode,'duration':40,'overlap':4,'beatMatch':True})
            self.assertLess(abs(len(out)/self.sr-40),.06)
            self.assertTrue(np.isfinite(out).all())

if __name__=='__main__':unittest.main()
